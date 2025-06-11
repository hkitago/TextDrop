//
//  download.js
//  TextDrop
//
//  Created by Hiroyuki KITAGO on 2025/06/11.
//

const p = new URLSearchParams(location.search);
const url = p.get('u');
const name = p.get('n') || 'Downloaded-by-textDrop.txt';

const a = document.createElement('a');
a.href = url;
a.download = name;
a.style.display = 'none';
document.body.appendChild(a);
a.click();

setTimeout(() => window.close(), 5000);
