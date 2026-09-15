import { BankParserFactory } from '../../src/infrastructure/parsers/bank-parser.factory';
import { GnbParaguayParser } from '../../src/infrastructure/parsers/gnb-paraguay.parser';
import { UenoBankParser } from '../../src/infrastructure/parsers/ueno-bank.parser';
import { ItauParaguayParser } from '../../src/infrastructure/parsers/itau-paraguay.parser';

describe('Multi-Bank Parsers Suite (Itaú, GNB, UENO)', () => {
  const factory = new BankParserFactory();

  const gnbEmail = `Transferencia Interbancaria Recibida:

Estimado cliente, se le informa que se ha registrado un crédito a su cuenta por la siguiente operación:
	
N° Comprobante: \t001000400059002576067420260914
Referencia: \tCOMAPYPAARES260914728770001549990
Fecha y hora: \t14/09/26 20:14
Enviado por: \tDA EL YANG PARK
Entidad Pagadora: \tUENO BANK S.A
N° Cuenta Pagador: \t0000000619739898
Importe: \tPYG 120000
Cuenta crédito: \t0000013132236001
Denominación crédito: \tFranco Girala
Comentario: \tCOMAPYPAARES260914728770001549990`;

  const uenoEmail = `Recibiste una transferencia
Podés visualizar el detalle de la operación desde los movimientos de tu app.
Monto Gs. 152.000
Titular cuenta débito FRANCO URIEL GIRALA CRISTALDO
Entidad débito UENO BANK S.A.
Beneficiario FRANCO URIEL GIRALA CRISTALDO
Entidad beneficiario UENO BANK S.A.
Nro. de transacción 6693320
Fecha y hora transferencia 07/07/2026 22:18:54 h`;

  const itauEmail = `A continuación el detalle de la operación:
Nro. de operación: \tCOMAPYPAARES260914370460000640061
Fecha y hora de operación: \t14/09/2026 10:17:26
Cliente Pagador: \tMIA FIORELLA GIMENEZ AQUINO
Nro. de cuenta del pagador: \t0000000619411905
Entidad pagadora: \tUENO BANK S.A.
Moneda y Monto: \tPYG 45,000
Nro. de cuenta crédito: \t720805917
Nro. comprobante: \t8351454
Concepto de la Transferencia: \t/BNF/
Estado: \tTransferencia acreditada en cuenta`;

  it('1. GNB Parser - debe extraer comprobante, pagador y monto exacto de 120.000 Gs', () => {
    const parser = new GnbParaguayParser();
    expect(parser.canParse(gnbEmail)).toBe(true);

    const result = parser.parse(gnbEmail);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(120000);
    expect(result?.payerName).toBe('DA EL YANG PARK');
    expect(result?.operationId).toBe('COMAPYPAARES260914728770001549990');
    expect(result?.receiptNumber).toBe('001000400059002576067420260914');
    expect(result?.payerBank).toBe('UENO BANK S.A');
  });

  it('2. UENO Parser - debe extraer transacción 6693320 y monto 152.000 Gs', () => {
    const parser = new UenoBankParser();
    expect(parser.canParse(uenoEmail)).toBe(true);

    const result = parser.parse(uenoEmail);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(152000);
    expect(result?.payerName).toBe('FRANCO URIEL GIRALA CRISTALDO');
    expect(result?.receiptNumber).toBe('6693320');
    expect(result?.payerBank).toBe('UENO BANK S.A.');
  });

  it('3. BankParserFactory - debe enrutar automáticamente cada banco al parser correspondiente', () => {
    const resGnb = factory.parse(gnbEmail);
    expect(resGnb?.payerName).toBe('DA EL YANG PARK');
    expect(resGnb?.amount).toBe(120000);

    const resUeno = factory.parse(uenoEmail);
    expect(resUeno?.payerName).toBe('FRANCO URIEL GIRALA CRISTALDO');
    expect(resUeno?.amount).toBe(152000);

    const resItau = factory.parse(itauEmail);
    expect(resItau?.payerName).toBe('MIA FIORELLA GIMENEZ AQUINO');
    expect(resItau?.amount).toBe(45000);
  });
});
