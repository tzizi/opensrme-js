import * as bin_types from "./bin_all";
import * as datastream from "./datastream";
import * as sprite from "./sprite";


function read_array<T>(read_func: Function, buffer: Buffer, offset: number): [T[], number] {
    let result: T[] = [];

    const count = buffer.readInt16BE(offset);
    offset += 2;

    for (let i = 0; i < count; i++) {
        let current: T;
        [current, offset] = read_func(buffer, offset);

        result.push(current);
    }

    return [result, offset];
}


function read_palette(buffer: Buffer, offset: number): [bin_types.Palette, number] {
    let size = buffer.readInt32BE(offset);
    offset += 4;

    let elements = size / 3;

    let palette: bin_types.Palette = { colors: [] };

    for (var j = 0; j < elements; j++) {
        palette.colors.push(
            bin_types.color(
                buffer.readUInt8(offset++),
                buffer.readUInt8(offset++),
                buffer.readUInt8(offset++)
            ));
    }

    return [palette, offset];
}

function read_palettes(buffer: Buffer, offset: number): [bin_types.Palette[], number] {
    let palette_amt: number = buffer.readInt16BE(offset);
    offset += 2;

    let palettes: bin_types.Palette[] = [];

    for (var i = 0; i < palette_amt; i++) {
        let palette: bin_types.Palette;
        [palette, offset] = read_palette(buffer, offset);

        palettes.push(palette);
    }

    return [palettes, offset];
}


function read_fonts(buffer: Buffer, offset: number): [bin_types.Font[], number] {
    let font_amt: number = buffer.readInt16BE(offset);
    offset += 2;

    let font_paths: string[] = [];
    let font_styles: bin_types.FontStyle[][] = [];
    let font_global_offsets: number[] = [];

    for (let font_i = 0; font_i < font_amt; font_i++) {
        let font_path: string;
        [font_path, offset] = datastream.read_utf8(buffer, offset);

        let current_global_offset = 0;

        // always 1
        let style_amt = buffer.readInt16BE(offset);
        offset += 2;

        let current_font_styles: bin_types.FontStyle[] = [];

        for (let style_i = 0; style_i < style_amt; style_i++) {
            offset += 4;

            current_global_offset = buffer.readInt16BE(offset);
            offset += 2;

            let current_style: bin_types.FontStyle = {
                widths: [],
                offsets: []
            };

            for (let glyph_i = 0; glyph_i < 256; glyph_i++) {
                current_style.offsets.push(buffer.readInt16BE(offset));
                offset += 2;

                current_style.widths.push(buffer.readInt16BE(offset) - current_global_offset);
                offset += 2;
            }

            current_font_styles.push(current_style);
        }

        font_paths.push(font_path);
        font_styles.push(current_font_styles);
        font_global_offsets.push(current_global_offset);
    }

    font_amt = buffer.readInt16BE(offset);
    offset += 2;

    let fonts: bin_types.Font[] = [];

    for (let font_i = 0; font_i < font_amt; font_i++) {
        let font_id = buffer.readInt32BE(offset);offset += 4;
        let palette_id = buffer.readInt32BE(offset);offset += 4;

        fonts.push({
            path: font_paths[font_id],
            palette: palette_id,
            height: -1,
            styles: font_styles[font_id],
            global_offset: font_global_offsets[font_id]
        });
    }

    return [fonts, offset];
}


function read_language(buffer: Buffer, offset: number): [bin_types.Language, number] {
    offset += 4;

    let language: bin_types.Language = {
        strings: [],
        font_style: 0
    };

    let strings_amt = buffer.readInt16BE(offset);
    offset += 2;

    for (let string_i = 0; string_i < strings_amt; string_i++) {
        let str: string;
        [str, offset] = datastream.read_latin1(buffer, offset);

        language.strings.push(str);
    }

    // always 0
    language.font_style = buffer.readInt16BE(offset);
    offset += 2;

    return [language, offset];
}

function read_languages(buffer: Buffer, offset: number): [bin_types.Language[], number] {
    let languages_amt = buffer.readInt16BE(offset);
    offset += 2;

    let languages: bin_types.Language[] = [];

    for (let lang_i = 0; lang_i < languages_amt; lang_i++) {
        let language: bin_types.Language;
        [language, offset] = read_language(buffer, offset);

        languages.push(language);
    }

    return [languages, offset];
}


function read_images(buffer: Buffer, offset: number): [string[], number] {
    let image_paths: string[] = [];
    let images_amt = buffer.readInt16BE(offset);
    offset += 2;

    for (let image_i = 0; image_i < images_amt; image_i++) {
        let image_path: string = "";
        [image_path, offset] = datastream.read_utf8(buffer, offset);

        image_paths.push(image_path);
    }

    return [image_paths, offset];
}

function read_sprites(buffer: Buffer, offset: number): [bin_types.Sprite[], string[], number] {
    let sprites_amt = buffer.readInt16BE(offset);
    offset += 2;

    // sprite_info_offsets is a list of offsets to the sprite_infos array
    let sprite_info_offsets: number[] = [0];
    let aabbs: bin_types.DrawCommand_AABB[] = [];

    for (let sprite_i = 0; sprite_i < sprites_amt; sprite_i++) {
        let aabb_x = buffer.readInt16BE(offset);offset += 2;
        let aabb_y = buffer.readInt16BE(offset);offset += 2;
        let aabb_width = buffer.readInt16BE(offset);offset += 2;
        let aabb_height = buffer.readInt16BE(offset);offset += 2;

        let aabb: bin_types.DrawCommand_AABB = {
            x: aabb_x,
            y: aabb_y,
            width: aabb_width,
            height: aabb_height
        };

        aabbs.push(aabb);

        sprite_info_offsets.push(buffer.readInt16BE(offset));
        offset += 2;
    }

    let sprite_infos: number[] = [];
    for (let sprite_info_i = 0; sprite_info_i < sprite_info_offsets[sprites_amt]; sprite_info_i++) {
        sprite_infos.push(buffer.readInt16BE(offset));
        offset += 2;
    }

    let image_paths: string[] = [];
    [image_paths, offset] = read_images(buffer, offset);

    // Here we deviate from the original source code by parsing the sprites up-front.
    // This makes it easier to inspect/debug, at the cost of slightly higher memory and
    // slightly increased initial load time.

    let sprites: bin_types.Sprite[] = [];

    let last_offset = -1;
    let sprite_id = 0;
    for (const sprite_info_offset of sprite_info_offsets) {
        sprite_id++;

        if (last_offset >= 0) {
            let sprite_info_vec = sprite_infos.slice(last_offset, sprite_info_offset);

            sprites.push(sprite.create_sprite(sprite_info_vec, aabbs[sprite_id - 2]));
        }

        last_offset = sprite_info_offset;
    }

    // FIXME: Do we need to create another sprite for the last offset? It doesn't seem to work

    return [sprites, image_paths, offset];
}


function read_clip(buffer: Buffer, offset: number): [bin_types.Clip, number] {
    let clip = [];

    const orientation_amt = buffer.readInt16BE(offset);
    offset += 2;

    for (let orientation_i = 0; orientation_i < orientation_amt; orientation_i++) {
        let frames = [];

        const frames_amt = buffer.readInt16BE(offset);
        offset += 2;

        for (let frame_i = 0; frame_i < frames_amt; frame_i++) {
            frames.push(buffer.readInt16BE(offset));
            offset += 2;
        }

        clip.push(frames);
    }

    return [clip, offset];
}

function read_clips(buffer: Buffer, offset: number): [bin_types.Clip[], number] {
    return read_array<bin_types.Clip>(read_clip, buffer, offset);
}


function read_sound(buffer: Buffer, offset: number): [bin_types.Sound, number] {
    let path: string;
    [path, offset] = datastream.read_utf8(buffer, offset)

    let mime: string;
    [mime, offset] = datastream.read_utf8(buffer, offset);

    let priority = buffer.readInt32BE(offset);
    offset += 4;

    let deferred_load = buffer.readInt8(offset) === 1;
    offset += 1;

    return [{
        path,
        mime,
        priority,
        deferred_load
    }, offset];
}

function read_sounds(buffer: Buffer, offset: number): [bin_types.Sound[], number] {
    return read_array<bin_types.Sound>(read_sound, buffer, offset);
}


function read_item(buffer: Buffer, offset: number): [bin_types.Item, number] {
    const type: bin_types.ItemType = buffer.readInt32BE(offset);
    offset += 4;

    const price = buffer.readInt32BE(offset);
    offset += 4;

    const increment = buffer.readInt32BE(offset);
    offset += 4;

    const maximum = buffer.readInt32BE(offset);
    offset += 4;

    const name = buffer.readInt32BE(offset);
    offset += 4;

    const description = buffer.readInt32BE(offset);
    offset += 4;

    const sprite: bin_types.SpriteId = buffer.readInt16BE(offset);
    offset += 2;

    return [{
        type,
        price,
        increment,
        maximum,
        name,
        description,
        sprite
    }, offset];
}

function read_items(buffer: Buffer, offset: number): [bin_types.Item[], number] {
    return read_array<bin_types.Item>(read_item, buffer, offset);
}


export function read_bin_all(buffer: Buffer): bin_types.All {
    let offset = 0;

    let all: bin_types.All = {
        palettes: [],
        fonts: [],
        languages: [],
        images: [],
        sprites: [],
        clips: [],
        sounds: [],
        items: []
    };

    [all.palettes, offset]  = read_palettes(buffer, offset);
    [all.fonts, offset]     = read_fonts(buffer, offset);
    [all.languages, offset] = read_languages(buffer, offset);
    [all.sprites,
        all.images, offset] = read_sprites(buffer, offset);
    [all.clips, offset]     = read_clips(buffer, offset);
    [all.sounds, offset]    = read_sounds(buffer, offset);
    [all.items, offset]     = read_items(buffer, offset);

    return all;
}
