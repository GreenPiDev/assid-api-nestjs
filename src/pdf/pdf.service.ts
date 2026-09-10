import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'fs/promises';
import { join } from 'path';

const FONTS_DIR = join(process.cwd(), 'assets', 'fonts');

export interface TrFonts {
  regular: PDFFont;
  bold: PDFFont;
}

@Injectable()
export class PdfService {
  async loadTemplate(bytes: Uint8Array): Promise<PDFDocument> {
    const doc = await PDFDocument.load(bytes);
    doc.registerFontkit(fontkit);
    return doc;
  }

  async create(): Promise<PDFDocument> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    return doc;
  }

  // Türkçe karakterler (ğ, ş, ı, İ) pdf-lib'in standart Helvetica fontunda
  // yer almadığından, Türkçe metin yazdırılacak her yerde bu şekilde
  // embed edilmiş bir TTF font kullanılmalı (örn. Noto Sans).
  //
  // subset: false ZORUNLU — pdf-lib'in subsetting mantığı bu fontta (ve
  // benzer karmaşık GSUB/GPOS tablolu fontlarda) glif eşlemesini bozup
  // Türkçe karakterlerin (ve hatta bazı Latin harflerin) tamamen kaybolmasına
  // yol açıyor. subset:false ile dosya boyutu büyür ama render doğru olur.
  async embedFont(doc: PDFDocument, fontBytes: Uint8Array): Promise<PDFFont> {
    return doc.embedFont(fontBytes, { subset: false });
  }

  // Üyelik başvuru PDF'i gibi Türkçe içerikli belgeler için varsayılan
  // font çifti (assets/fonts/NotoSans-Regular.ttf / NotoSans-Bold.ttf,
  // OFL lisanslı, fonttools ile değişken fonttan statik enstansiye edildi).
  async embedTrFonts(doc: PDFDocument): Promise<TrFonts> {
    const [regularBytes, boldBytes] = await Promise.all([
      readFile(join(FONTS_DIR, 'NotoSans-Regular.ttf')),
      readFile(join(FONTS_DIR, 'NotoSans-Bold.ttf')),
    ]);
    const [regular, bold] = await Promise.all([
      this.embedFont(doc, regularBytes),
      this.embedFont(doc, boldBytes),
    ]);
    return { regular, bold };
  }

  drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 10): void {
    page.drawText(text, { x, y, size, font });
  }

  async save(doc: PDFDocument): Promise<Buffer> {
    const bytes = await doc.save();
    return Buffer.from(bytes);
  }
}
