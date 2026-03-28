/**
 * Minimal MessagePack encoder used for Hyperliquid L1 action hashing.
 * Adapted from the Deno std/msgpack encoder (MIT).
 */

type MsgPackValue =
  | number
  | bigint
  | string
  | boolean
  | null
  | Uint8Array
  | readonly MsgPackValue[]
  | { [key: string | number]: MsgPackValue };

const encoder = new TextEncoder();

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeFloat64(value: number): Uint8Array {
  const view = new DataView(new ArrayBuffer(9));
  view.setUint8(0, 0xcb);
  view.setFloat64(1, value);
  return new Uint8Array(view.buffer);
}

function encodeNumber(value: number): Uint8Array {
  if (!Number.isInteger(value)) return encodeFloat64(value);

  if (value < 0) {
    if (value >= -32) return new Uint8Array([value]);
    if (value >= -128) return new Uint8Array([0xd0, value]);
    if (value >= -32768) {
      const view = new DataView(new ArrayBuffer(3));
      view.setUint8(0, 0xd1);
      view.setInt16(1, value);
      return new Uint8Array(view.buffer);
    }
    if (value >= -2147483648) {
      const view = new DataView(new ArrayBuffer(5));
      view.setUint8(0, 0xd2);
      view.setInt32(1, value);
      return new Uint8Array(view.buffer);
    }
    return encodeFloat64(value);
  }

  if (value <= 0x7f) return new Uint8Array([value]);
  if (value < 0x100) return new Uint8Array([0xcc, value]);
  if (value < 0x10000) {
    const view = new DataView(new ArrayBuffer(3));
    view.setUint8(0, 0xcd);
    view.setUint16(1, value);
    return new Uint8Array(view.buffer);
  }
  if (value < 0x100000000) {
    const view = new DataView(new ArrayBuffer(5));
    view.setUint8(0, 0xce);
    view.setUint32(1, value);
    return new Uint8Array(view.buffer);
  }
  return encodeFloat64(value);
}

function encodeValue(value: MsgPackValue, parts: Uint8Array[]): void {
  if (value === null) {
    parts.push(new Uint8Array([0xc0]));
    return;
  }

  if (value === false) {
    parts.push(new Uint8Array([0xc2]));
    return;
  }

  if (value === true) {
    parts.push(new Uint8Array([0xc3]));
    return;
  }

  if (typeof value === 'number') {
    parts.push(encodeNumber(value));
    return;
  }

  if (typeof value === 'bigint') {
    if (value < 0n) {
      const view = new DataView(new ArrayBuffer(9));
      view.setUint8(0, 0xd3);
      view.setBigInt64(1, value);
      parts.push(new Uint8Array(view.buffer));
      return;
    }
    const view = new DataView(new ArrayBuffer(9));
    view.setUint8(0, 0xcf);
    view.setBigUint64(1, value);
    parts.push(new Uint8Array(view.buffer));
    return;
  }

  if (typeof value === 'string') {
    const bytes = encoder.encode(value);
    const len = bytes.length;
    if (len < 32) {
      parts.push(new Uint8Array([0xa0 | len]));
    } else if (len < 0x100) {
      parts.push(new Uint8Array([0xd9, len]));
    } else if (len < 0x10000) {
      const view = new DataView(new ArrayBuffer(3));
      view.setUint8(0, 0xda);
      view.setUint16(1, len);
      parts.push(new Uint8Array(view.buffer));
    } else {
      const view = new DataView(new ArrayBuffer(5));
      view.setUint8(0, 0xdb);
      view.setUint32(1, len);
      parts.push(new Uint8Array(view.buffer));
    }
    parts.push(bytes);
    return;
  }

  if (value instanceof Uint8Array) {
    const len = value.length;
    if (len < 0x100) {
      parts.push(new Uint8Array([0xc4, len]));
    } else if (len < 0x10000) {
      const view = new DataView(new ArrayBuffer(3));
      view.setUint8(0, 0xc5);
      view.setUint16(1, len);
      parts.push(new Uint8Array(view.buffer));
    } else {
      const view = new DataView(new ArrayBuffer(5));
      view.setUint8(0, 0xc6);
      view.setUint32(1, len);
      parts.push(new Uint8Array(view.buffer));
    }
    parts.push(value);
    return;
  }

  if (Array.isArray(value)) {
    const len = value.length;
    if (len < 16) {
      parts.push(new Uint8Array([0x90 | len]));
    } else if (len < 0x10000) {
      const view = new DataView(new ArrayBuffer(3));
      view.setUint8(0, 0xdc);
      view.setUint16(1, len);
      parts.push(new Uint8Array(view.buffer));
    } else {
      const view = new DataView(new ArrayBuffer(5));
      view.setUint8(0, 0xdd);
      view.setUint32(1, len);
      parts.push(new Uint8Array(view.buffer));
    }
    for (const item of value) encodeValue(item, parts);
    return;
  }

  const keys = Object.keys(value);
  const len = keys.length;
  if (len < 16) {
    parts.push(new Uint8Array([0x80 | len]));
  } else if (len < 0x10000) {
    const view = new DataView(new ArrayBuffer(3));
    view.setUint8(0, 0xde);
    view.setUint16(1, len);
    parts.push(new Uint8Array(view.buffer));
  } else {
    const view = new DataView(new ArrayBuffer(5));
    view.setUint8(0, 0xdf);
    view.setUint32(1, len);
    parts.push(new Uint8Array(view.buffer));
  }

  for (const key of keys) {
    encodeValue(key, parts);
    encodeValue((value as Record<string, MsgPackValue>)[key], parts);
  }
}

export function encodeMsgPack(value: MsgPackValue): Uint8Array {
  const parts: Uint8Array[] = [];
  encodeValue(value, parts);
  return concat(parts);
}
