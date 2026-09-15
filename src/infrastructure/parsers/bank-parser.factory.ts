import { IBankParser, ParsedTransferData } from '../../domain/ports/transfer-repository.interface';
import { ItauParaguayParser } from './itau-paraguay.parser';
import { GnbParaguayParser } from './gnb-paraguay.parser';
import { UenoBankParser } from './ueno-bank.parser';

export class BankParserFactory {
  private parsers: IBankParser[] = [
    new ItauParaguayParser(),
    new GnbParaguayParser(),
    new UenoBankParser()
  ];

  public registerParser(parser: IBankParser): void {
    this.parsers.push(parser);
  }

  public getSupportedBanks(): string[] {
    return this.parsers.map(p => p.bankName);
  }

  public parse(content: string, activeBankFilter: string = 'ALL'): ParsedTransferData | null {
    const filteredParsers = this.parsers.filter(p => {
      if (!activeBankFilter || activeBankFilter === 'ALL') return true;
      if (activeBankFilter === 'ITAU') return p.bankName.toLowerCase().includes('itau');
      if (activeBankFilter === 'GNB') return p.bankName.toLowerCase().includes('gnb');
      if (activeBankFilter === 'UENO') return p.bankName.toLowerCase().includes('ueno');
      return true;
    });

    for (const parser of filteredParsers) {
      if (parser.canParse(content)) {
        const result = parser.parse(content);
        if (result) return result;
      }
    }

    // Fallback: try filtered parsers directly
    for (const parser of filteredParsers) {
      const result = parser.parse(content);
      if (result) return result;
    }

    return null;
  }
}
