import { IBankParser, ParsedTransferData } from '../../domain/ports/transfer-repository.interface';

export class UenoBankParser implements IBankParser {
  public readonly bankName = 'UENO Bank Paraguay';

  public canParse(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    const lower = content.toLowerCase();
    return lower.includes('ueno') || 
           (lower.includes('recibiste una transferencia') && (lower.includes('titular cuenta d') || lower.includes('entidad d')));
  }

  public parse(content: string): ParsedTransferData | null {
    if (!content) return null;
    const text = content.includes('<') && content.includes('>')
      ? this.htmlToPlainText(content)
      : String(content);

    const getField = (pattern: RegExp): string | null => {
      const match = text.match(pattern);
      return match && match[1] ? match[1].trim() : null;
    };

    const rawAmount = getField(/Monto\s*[:\t ]*\s*([A-Za-z$.]*\s*[\d,.]+)/i);
    const payerName = getField(/Titular\s*cuenta\s*d[eé]bito\s*[:\t ]*\s*([^\r\n\t]+)/i);
    const payerBank = getField(/Entidad\s*d[eé]bito\s*[:\t ]*\s*([^\r\n\t]+)/i);
    const creditAccount = getField(/Beneficiario\s*[:\t ]*\s*([^\r\n\t]+)/i);
    const receiptNumber = getField(/Nro\.?\s*de\s*transacci[oó]n\s*[:\t ]*\s*([0-9A-Za-z]+)/i);
    const operationDate = getField(/Fecha\s*y\s*hora\s*(?:de\s*)?transferencia\s*[:\t ]*\s*([\d/]+(?:\s+[\d:]+)?)/i);

    if (!receiptNumber && !payerName) {
      return null;
    }

    const { currency, amount } = this.parseAmount(rawAmount);

    return {
      operationId: receiptNumber || `UENO-${Date.now()}`,
      receiptNumber: receiptNumber || 'UENO-TRANSFER',
      operationDate: operationDate || new Date().toISOString(),
      payerName: payerName ? payerName.replace(/\s+/g, ' ') : 'DESCONOCIDO',
      payerAccount: null,
      payerBank: payerBank ? payerBank.replace(/\s+/g, ' ') : 'UENO BANK S.A.',
      currency,
      amount,
      creditAccount: creditAccount || null,
      concept: null,
      state: 'Acreditada',
      rawText: text
    };
  }

  private parseAmount(amountStr: string | null): { currency: string; amount: number } {
    if (!amountStr) return { currency: 'PYG', amount: 0 };
    const cleaned = amountStr.trim();
    const currMatch = cleaned.match(/^([A-Za-z$.]+)\s*(.*)$/);
    let currency = 'PYG';
    let numPart = cleaned;
    if (currMatch) {
      const prefix = currMatch[1].toUpperCase().replace(/\./g, '');
      if (prefix === 'PYG' || prefix === 'GS' || prefix === 'G') currency = 'PYG';
      else if (prefix === 'USD' || prefix === 'U$S') currency = 'USD';
      else currency = prefix;
      numPart = currMatch[2];
    }

    let numVal = 0;
    if (currency === 'PYG') {
      numVal = parseInt(numPart.replace(/[^0-9]/g, ''), 10) || 0;
    } else {
      numVal = parseFloat(numPart.replace(/,/g, '')) || 0;
    }

    return { currency, amount: numVal };
  }

  private htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/td>/gi, '\t')
      .replace(/<\/th>/gi, '\t')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }
}
