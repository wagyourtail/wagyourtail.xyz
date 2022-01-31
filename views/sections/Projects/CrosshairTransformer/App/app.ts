const DICTIONARY = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789";
const DICTIONARY_LENGTH = BigInt(DICTIONARY.length);

const serializeToBytes = info => {
    const bytes = [
        0,
        1,
        (info.cl_crosshairgap * 10) & 0xff,
        (info.cl_crosshair_outlinethickness * 2) & 7,
        info.cl_crosshaircolor_r,
        info.cl_crosshaircolor_g,
        info.cl_crosshaircolor_b,
        info.cl_crosshairalpha,
        info.cl_crosshair_dynamic_splitdist,
        (info.cl_fixedcrosshairgap * 10) & 0xff,
        (info.cl_crosshaircolor & 7) |
            (info.cl_crosshair_drawoutline ? 8 : 0) |
            (info.cl_crosshair_dynamic_splitalpha_innermod * 10) << 4,
        ((info.cl_crosshair_dynamic_splitalpha_outermod * 10) & 0xf) |
            ((info.cl_crosshair_dynamic_maxdist_splitratio * 10) << 4),
        (info.cl_crosshairthickness * 10) & 0x3f,
        ((info.cl_crosshairstyle << 1) & 0xe) |
            (info.cl_crosshairdot ? 0x10 : 0) |
            (info.cl_crosshairgap_useweaponvalue ? 0x20 : 0) |
            (info.cl_crosshairusealpha ? 0x40 : 0) |
            (info.cl_crosshair_t ? 0x80 : 0),
        (info.cl_crosshairsize * 10) & 0xff,
        ((info.cl_crosshairsize * 10) >> 8) & 0x1f,
        0,
        0
    ];
    let sum = 0;
    for (let i = 1; i < bytes.length; ++i) {
        sum += bytes[i];
    }
    bytes[0] = sum & 0xff;
    return bytes;
};

const encode = info => {
    const bytes = serializeToBytes(info);
    
    let acc = 0n;
    let pos = 1n;
    for (let i = bytes.length; i --> 0;) {
        acc += BigInt(bytes[i]) * pos;
        pos *= 256n;
    }
    
    let result = '';
    for (let i = 0; i < 25; ++i) {
        const digit = acc % DICTIONARY_LENGTH;
        acc = acc / DICTIONARY_LENGTH;
        result += DICTIONARY.charAt(Number(digit));
    }
    
    return `CSGO-${result.slice(0, 5)}-${result.slice(5, 10)}-${result.slice(10, 15)}-${result.slice(15, 20)}-${result.slice(20, 25)}`;
};

const BigNumber = require("bignumber.js");

// Intentionally no 0 and 1 number in DICTIONARY
const DICTIONARY = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789";
const DICTIONARY_LENGTH = DICTIONARY.length;
const SHARECODE_PATTERN = /CSGO(-?[\w]{5}){5}$/;

const bigNumberToByteArray = big => {
  const str = big.toString(16).padStart(36, "0");
  const bytes = [];

  for (let i = 0; i < str.length; i += 2) {
    bytes.push(parseInt(str.slice(i, i + 2), 16));
  }

  return bytes;
}

const parseBytes = bytes => {
  return {
    cl_crosshairgap: Int8Array.of(bytes[2])[0] / 10.0,

    cl_crosshair_outlinethickness: (bytes[3] & 7) / 2.0,

    cl_crosshaircolor_r: bytes[4],
    cl_crosshaircolor_g: bytes[5],
    cl_crosshaircolor_b: bytes[6],
    cl_crosshairalpha: bytes[7],
    cl_crosshair_dynamic_splitdist: bytes[8],

    cl_fixedcrosshairgap: Int8Array.of(bytes[9])[0] / 10.0,

    cl_crosshaircolor: bytes[10] & 7,
    cl_crosshair_drawoutline: bytes[10] & 8 ? 1 : 0,
    cl_crosshair_dynamic_splitalpha_innermod: ((bytes[10] & 0xF0) >> 4) / 10.0,

    cl_crosshair_dynamic_splitalpha_outermod: (bytes[11] & 0xF) / 10.0,
    cl_crosshair_dynamic_maxdist_splitratio: ((bytes[11] & 0xF0) >> 4) / 10.0,

    cl_crosshairthickness: (bytes[12] & 0x3F) / 10.0,

    cl_crosshairstyle: (bytes[13] & 0xE) >> 1,
    cl_crosshairdot: bytes[13] & 0x10 ? 1 : 0,
    cl_crosshairgap_useweaponvalue: bytes[13] & 0x20 ? 1 : 0,
    cl_crosshairusealpha: bytes[13] & 0x40 ? 1 : 0,
    cl_crosshair_t: bytes[13] & 0x80 ? 1 : 0,

    cl_crosshairsize: (((bytes[15] & 0x1f) << 8) + bytes[14]) / 10.0
  };
}

const decode = shareCode => {
  if (!shareCode.match(SHARECODE_PATTERN)) {
    throw new Error('Invalid share code');
  }

  shareCode = shareCode.replace(/CSGO|-/g, '');
  const chars = Array.from(shareCode).reverse();
  let big = new BigNumber(0);

  for (let i = 0; i < chars.length; i++) {
    big = big.multipliedBy(DICTIONARY_LENGTH).plus(DICTIONARY.indexOf(chars[i]));
  }
  
  return parseBytes(bigNumberToByteArray(big));
}

console.log(decode('CSGO-O4Jsi-V36wY-rTMGK-9w7qF-jQ8WB'))

