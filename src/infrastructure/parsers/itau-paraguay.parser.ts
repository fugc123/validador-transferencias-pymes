import { IBankParser, ParsedTransferData } from '../../domain/ports/transfer-repository.interface';

export class ItauParaguayParser implements IBankParser {
  public readonly bankName = 'Banco Itaú Paraguay';

  public canParse(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    const lower = content.toLowerCase();
    return lower.includes('itau') || lower.includes('itaú') || lower.includes('sipap') || 
           (lower.includes('acreditada') && (lower.includes('operaci') || lower.includes('transferencia'))) ||
           (lower.includes('detalle de la operaci') && (lower.includes('debitado de') || lower.includes('monto de la transferencia')));
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

    const operationId = getField(/Nro\.?\s*de\s*operaci[oó]n:\s*([A-Za-z0-9]+)/i);
    const operationDate = getField(/Fecha\s*y\s*hora\s*de\s*operaci[oó]n:\s*([\d/]+(?:\s+[\d:]+)?)/i);
    const payerName = getField(/(?:Cliente\s*Pagador|Debitado\s*de|Enviado\s*por):\s*([^\r\n]+)/i);
    const payerAccount = getField(/(?:Nro\.?\s*de\s*cuenta\s*del\s*pagador|Cuenta\s*D[eé]bito):\s*([0-9]+)/i);
    const payerBank = getField(/(?:Entidad\s*pagadora|Banco\s*del\s*pagador|Entidad\s*D[eé]bito):\s*([^\r\n]+)/i);
    const rawAmount = getField(/(?:Moneda\s*y\s*Monto|Monto\s*de\s*la\s*transferencia|Monto|Importe):\s*([^\r\n]+)/i);
    const creditAccount = getField(/(?:Nro\.?\s*de\s*cuenta\s*cr[eé]dito|Acreditado\s*a\s*la\s*cuenta\s*de):\s*([A-Za-z0-9]+)/i);
    const receiptNumber = getField(/(?:Nro\.?\s*comprobante|Referencia|Comprobante):\s*([A-Za-z0-9]+)/i);
    const concept = getField(/(?:Concepto\s*de\s*la\s*Transferencia|Concepto|Mensaje):\s*([^\r\n]+)/i);
    const state = getField(/Estado:\s*([^\r\n]+)/i);

    if (!operationId && !receiptNumber) {
      return null;
    }

    const { currency, amount } = this.parseAmount(rawAmount);

    return {
      operationId: operationId || receiptNumber!,
      receiptNumber: receiptNumber || operationId!,
      operationDate: operationDate || new Date().toISOString(),
      payerName: payerName ? payerName.replace(/\s+/g, ' ') : 'DESCONOCIDO',
      payerAccount: payerAccount || null,
      payerBank: payerBank ? payerBank.replace(/\s+/g, ' ') : 'Banco Itaú',
      currency,
      amount,
      creditAccount: creditAccount || null,
      concept: concept || null,
      state: state || 'Acreditada',
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
