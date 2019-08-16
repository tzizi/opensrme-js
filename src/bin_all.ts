export type Id = number;
export type SpriteId = Id;
export type PaletteId = Id;
export type FontId = Id;
export type LanguageId = Id;
export type ImageId = Id;

export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

export function color(r: number, g: number, b: number, a: number = 255): Color {
    return {
        r: r,
        g: g,
        b: b,
        a: a
    };
}

export interface Palette {
    colors: Color[]
}

// FIXME: Is this actually the style?
export interface FontStyle {
    widths: number[];
    offsets: number[];
}

export interface Font {
    path: string;
    palette: PaletteId;
    height: number;
    styles: FontStyle[];
    global_offset: number;
}

export interface Language {
    strings: string[];
    font_style: number
}

export interface DrawCommand_AABB {
    x: number,
    y: number,
    width: number,
    height: number
}

export enum DrawCommand_Type {
    Image = 0,
    HFlip = 1,
    VFlip = 2,
    SetOffset = 3,
    DrawSprite = 4,
    SetFrame = 5,
    SetColor = 6,

    DrawLine = 10,
    FillRect = 11,
    StrokeRect = 12,
    FillArc = 13,
    StrokeArc = 14
}

export interface DrawCommand_Image {
    image_id: ImageId,
    start_x: number,
    start_y: number
}

export interface DrawCommand_SetOffset {
    x: number,
    y: number
}

export type DrawCommand_DrawSprite = SpriteId;

export interface DrawCommand_SetFrame {
    frame: number,
    total_time: number,
    frames: number
}

export type DrawCommand_SetColor = Color;

export interface DrawCommand_DrawShape {
    x: number,
    y: number
}

export type DrawCommand_Value = null | DrawCommand_Image | DrawCommand_SetOffset | DrawCommand_DrawSprite
                                | DrawCommand_SetFrame | DrawCommand_SetColor | DrawCommand_DrawShape;

export interface DrawCommand {
    type: DrawCommand_Type;
    value: DrawCommand_Value;
}

export interface Sprite {
    aabb: DrawCommand_AABB;
    commands: DrawCommand[]
}

export interface All {
    palettes: Palette[],
    fonts: Font[],
    languages: Language[],
    images: string[],
    sprites: Sprite[]
}