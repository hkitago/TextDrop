//
//  localization.js
//  TextDrop
//
//  Created by Hiroyuki KITAGO on 2025/03/18.
//

const labelStrings = {
  "en": {
    "contextMenu": "TextDrop"
  },
  "ar": {
    "contextMenu": "علامة اللون"
  },
  "ar-SA": {
    "contextMenu": "علامة اللون"
  },
  "ca": {
    "contextMenu": "MarcaColor"
  },
  "cs": {
    "contextMenu": "BarevneOznaceni"
  },
  "da": {
    "contextMenu": "FarveMærke"
  },
  "de": {
    "contextMenu": "FarbMarkierung"
  },
  "el": {
    "contextMenu": "ΧρωματικήΣήμανση"
  },
  "en-AU": {
    "contextMenu": "TextDrop"
  },
  "en-CA": {
    "contextMenu": "TextDrop"
  },
  "en-GB": {
    "contextMenu": "TextDrop"
  },
  "es": {
    "contextMenu": "MarcaColor"
  },
  "es-MX": {
    "contextMenu": "MarcaColor"
  },
  "fi": {
    "contextMenu": "VäriMerkintä"
  },
  "fr": {
    "contextMenu": "MarqueCouleur"
  },
  "fr-CA": {
    "contextMenu": "MarqueCouleur"
  },
  "he": {
    "contextMenu": "סימוןצבע"
  },
  "hi": {
    "contextMenu": "रंगचिह्न"
  },
  "hr": {
    "contextMenu": "OznakaBoje"
  },
  "hu": {
    "contextMenu": "SzínJelölés"
  },
  "id": {
    "contextMenu": "TandaWarna"
  },
  "it": {
    "contextMenu": "MarcaColore"
  },
  "ja": {
    "contextMenu": "カラーマーク"
  },
  "ko-KR": {
    "contextMenu": "색상표시"
  },
  "ms": {
    "contextMenu": "TandaWarna"
  },
  "nb": {
    "contextMenu": "FargeMerking"
  },
  "nl": {
    "contextMenu": "KleurMarkering"
  },
  "pl": {
    "contextMenu": "OznaczenieKolorem"
  },
  "pt": {
    "contextMenu": "MarcaCor"
  },
  "pt-PT": {
    "contextMenu": "MarcaCor"
  },
  "pt-BR": {
    "contextMenu": "MarcaCor"
  },
  "ro": {
    "contextMenu": "MarcajCuloare"
  },
  "ru": {
    "contextMenu": "ЦветнаяМетка"
  },
  "sv": {
    "contextMenu": "FärgMarkering"
  },
  "sk": {
    "contextMenu": "FarebneOznacenie"
  },
  "th": {
    "contextMenu": "เครื่องหมายสี"
  },
  "tr": {
    "contextMenu": "RenkIsareti"
  },
  "uk": {
    "contextMenu": "КольороваМітка"
  },
  "vi": {
    "contextMenu": "DanhDauMau"
  },
  "zh": {
    "contextMenu": "颜色标记"
  },
  "zh-CN": {
    "contextMenu": "颜色标记"
  },
  "zh-TW": {
    "contextMenu": "顏色標記"
  },
  "zh-HK": {
    "contextMenu": "顏色標記"
  }
};

export const getCurrentLangLabelString = (key) => {
  const langCode = window.navigator.language || 'en';
  const baseLang = langCode.split('-')[0];

  return (
    labelStrings[langCode]?.[key] ??
    labelStrings[baseLang]?.[key] ??
    labelStrings.en[key]
  );
};
