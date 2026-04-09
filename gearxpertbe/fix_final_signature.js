const fs = require('fs');
const PizZip = require('pizzip');

const docPath = '../gearxpertfe/public/contracts/GearXpert_Contact_Supplier.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Remove ALL existing {{%signatureImage}} tags to start fresh
xml = xml.replace(/\{\{\%signatureImage\}\}/g, '');

// 2. Find "Ký tên bên B" at the end of the document.
// We'll use a regex that handles optional XML tags between characters
const regexB = /K[ýy]\s*(?:<[^>]+>\s*)*t[êe]n\s*(?:<[^>]+>\s*)*b[êe]n\s*(?:<[^>]+>\s*)*B/i;
const matchB = xml.match(regexB);

if (matchB) {

    // We want to insert the signature tag after the paragraph that contains "Ký tên bên B"
    // Find the closing </w:p> tag after the match
    const endOfParagraph = xml.indexOf('</w:p>', matchB.index);

    if (endOfParagraph !== -1) {
        // Prepare a new paragraph that is right-aligned for the signature image
        const signatureParagraph = '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>{{%signatureImage}}</w:t></w:r></w:p>';

        // Insert it after the current paragraph
        xml = xml.substring(0, endOfParagraph + 6) + signatureParagraph + xml.substring(endOfParagraph + 6);

        zip.file('word/document.xml', xml);
        const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs.writeFileSync(docPath, buf);
    } else {
        console.log('Could not find end of paragraph for Bên B.');
    }
} else {
    console.log('Could not find "Ký tên bên B" label in the document.');
}
