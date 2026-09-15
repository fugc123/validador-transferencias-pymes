import { ItauParaguayParser } from '../../src/infrastructure/parsers/itau-paraguay.parser';

describe('ItauParaguayParser Unit Test', () => {
  const parser = new ItauParaguayParser();

  const sampleEmail = `A continuación el detalle de la operación:
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

  it('debe detectar correctamente que es un correo de Itaú', () => {
    expect(parser.canParse(sampleEmail)).toBe(true);
  });

  it('debe parsear todos los campos del correo de Itaú con precisión', () => {
    const result = parser.parse(sampleEmail);
    expect(result).not.toBeNull();
    expect(result?.operationId).toBe('COMAPYPAARES260914370460000640061');
    expect(result?.receiptNumber).toBe('8351454');
    expect(result?.payerName).toBe('MIA FIORELLA GIMENEZ AQUINO');
    expect(result?.payerBank).toBe('UENO BANK S.A.');
    expect(result?.currency).toBe('PYG');
    expect(result?.amount).toBe(45000);
    expect(result?.creditAccount).toBe('720805917');
  });

  it('debe parsear el formato "Aviso de transferencia recibida" con Debitado de y Monto de la transferencia', () => {
    const realEmail = `A continuación el detalle de la operación:
Debitado de: \tALEJANDRA MONSERRAT CHENA GONZALEZ
Acreditado a la cuenta de: \t720805917
Banco del beneficiario: \tBanco Itaú S.A
Monto de la transferencia: \tPYG 26,000
Referencia: \t7008
Fecha y hora de operación: \t15/09/2026 09:34:33
Nro. de operación: \t45601
Mensaje:`;

    expect(parser.canParse(realEmail)).toBe(true);
    const result = parser.parse(realEmail);
    expect(result).not.toBeNull();
    expect(result?.operationId).toBe('45601');
    expect(result?.receiptNumber).toBe('7008');
    expect(result?.payerName).toBe('ALEJANDRA MONSERRAT CHENA GONZALEZ');
    expect(result?.amount).toBe(26000);
    expect(result?.currency).toBe('PYG');
    expect(result?.creditAccount).toBe('720805917');
  });

  it('debe devolver null si el correo no tiene identificadores', () => {
    const result = parser.parse('Hola, este es un mail personal sin datos bancarios');
    expect(result).toBeNull();
  });
});
