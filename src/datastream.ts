function read_string_as_buffer(buffer: Buffer, offset: number): [Buffer, number] {
    let len = buffer.readInt16BE(offset);
    offset += 2;

    let newbuffer = buffer.slice(offset, offset+len);
    offset += newbuffer.length;

    return [newbuffer, offset];
}

export function read_utf8(buffer: Buffer, offset: number): [string, number] {
    let newbuffer: Buffer;

    [newbuffer, offset] = read_string_as_buffer(buffer, offset);

    return [newbuffer.toString("utf8"), offset];
}

export function read_latin1(buffer: Buffer, offset: number): [string, number] {
    let newbuffer: Buffer;

    [newbuffer, offset] = read_string_as_buffer(buffer, offset);

    return [newbuffer.toString("latin1"), offset];
}
