import { IBankParser, ParsedTransferData } from '../../domain/ports/transfer-repository.interface';
import { ItauParaguayParser } from './itau-paraguay.parser';

export class BankParserFactory {
  private parsers: IBankParser[] = [
    new ItauParaguayParser()
  ];

  public registerParser(parser: IBankParser): void {
    this.parsers.push(parser);
  }

  public parse(content: string): ParsedTransferData | null {
    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const result = parser.parse(content);
        if (result) return result;
      }
    }

    // Fallback: try Itau parser directly as default
    return this.parsers[0].parse(content);
  }
}
