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

  public parse(content: string): ParsedTransferData | null {
    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const result = parser.parse(content);
        if (result) return result;
      }
    }

    // Try all parsers in order as fallback
    for (const parser of this.parsers) {
      const result = parser.parse(content);
      if (result) return result;
    }

    return null;
  }
}
