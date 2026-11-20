import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EInvoiceService } from "../services/einvoiceService.js";

describe("EInvoiceService honesty & mode guards", () => {
  const originalMode = process.env.EINVOICE_MODE;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.EINVOICE_MODE;
    else process.env.EINVOICE_MODE = originalMode;
  });

  it("returns explicit mock metadata and null CQT/invoice numbers in default mock mode", () => {
    delete process.env.EINVOICE_MODE;
    const res = EInvoiceService.generateInvoice({
      orderCode: "DH-2026-001",
      buyerName: "Công ty A",
      total: 1000000,
    });

    assert.equal(res.isMock, true);
    assert.equal(res.provider, "MOCK_SANDBOX");
    assert.equal(res.status, "MOCK_PREVIEW");
    assert.equal(res.cqtCode, null);
    assert.equal(res.invoiceNumber, null);
    assert.equal(res.invoiceLookupCode, null);
    assert.equal(res.viewUrl, null);
    assert.equal(res.pdfDownloadUrl, null);
  });

  it("throws an explicit error in live mode instead of fabricating invoice numbers", () => {
    process.env.EINVOICE_MODE = "live";
    assert.throws(
      () =>
        EInvoiceService.generateInvoice({
          orderCode: "DH-2026-002",
          buyerName: "Công ty B",
          total: 5000000,
        }),
      /EINVOICE_MODE=live/
    );
  });
});
