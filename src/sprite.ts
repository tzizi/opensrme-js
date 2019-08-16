import * as bin_types from "./bin_all";

function read_drawcommand(info: number[], offset: number): [bin_types.DrawCommand, number] {
    let value: bin_types.DrawCommand_Value = null;
    let end: number = offset + 1;

    let command = info[offset] & 0xff;
    switch (command) {
        // Image
        case 0:
            value = {
                image_id: (info[offset] >> 8) & 0xff,
                start_x: info[offset + 1],
                start_y: info[offset + 2]
            };

            end = offset + 3;
            break;

        // HFlip
        case 1:
        // VFlip
        case 2:
            break;

        // SetOffset
        case 3:
            value = {
                x: info[offset + 1],
                y: info[offset + 2]
            };

            end = offset + 3;
            break;

        // DrawSprite
        case 4:
            value = info[offset + 1];
            end = offset + 2;
            break;

        // SetFrame
        case 5:
            value = {
                frame: info[offset + 1],
                total_time: info[offset + 2],
                frames: info[offset + 3]
            };

            end = offset + 4;
            break;

        // SetColor
        case 6:
            value = {
                a: 0xff,
                r: info[offset + 1] & 0xff,
                g: (info[offset + 2] >> 8) & 0xff,
                b: (info[offset + 2]) & 0xff
            };

            end = offset + 3;
            break;

        // DrawLine
        case 10:
        // FillRect
        case 11:
        // StrokeRect
        case 12:
        // FillArc
        case 13:
        // StrokeArc
        case 14:
            value = {
                x: info[offset + 1],
                y: info[offset + 2]
            };

            end = offset + 3;
            break;

        default:
            // Invalid
            console.error("Invalid draw command: " + command);
            break;
    }

    return [{
        type: command,
        value: value
    }, end];
}

export function create_sprite(sprite_info: number[], aabb: bin_types.DrawCommand_AABB): bin_types.Sprite {
    let drawcommands: bin_types.DrawCommand[] = [];

    let offset = 0;
    while (offset < sprite_info.length) {
        let drawcommand: bin_types.DrawCommand;
        [drawcommand, offset] = read_drawcommand(sprite_info, offset);

        drawcommands.push(drawcommand);
    }

    return {
        aabb: aabb,
        commands: drawcommands
    };
}
