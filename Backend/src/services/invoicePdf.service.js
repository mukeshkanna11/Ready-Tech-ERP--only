const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const COLORS = {
  text: "#1F2937",
  muted: "#6B7280",
  light: "#9CA3AF",
  border: "#E5E7EB",
  zebra: "#F9FAFB",
  panel: "#F3F4F6",
  accent: "#1E3A8A",
  white: "#FFFFFF",
};

const STATUS_COLORS = {
  paid: "#15803D",
  partially_paid: "#B45309",
  issued: "#1D4ED8",
  overdue: "#B91C1C",
  cancelled: "#B91C1C",
  draft: "#6B7280",
};

const MARGIN = 36;
const FOOTER_SPACE = 30;

const IGST_SUPPLY_TYPES = ["inter_state", "export"];

const SUPPLY_TYPE_LABELS = {
  intra_state: "Intra-State",
  inter_state: "Inter-State",
  export: "Export",
  other: "Other",
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Built-in PDF fonts (Helvetica) cannot render "₹", so INR uses "Rs.".
const currencyPrefix = (currency) =>
  !currency || String(currency).toUpperCase() === "INR"
    ? "Rs."
    : String(currency).toUpperCase();

const money = (value, currency) =>
  `${currencyPrefix(currency)} ${formatNumber(value)}`;

const formatRate = (value) =>
  `${Number(Number(value || 0).toFixed(3))}%`;

const formatQuantity = (value) =>
  String(Number(Number(value || 0).toFixed(3)));

const humanize = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "-";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const hasAddress = (address) =>
  Boolean(
    address &&
      (address.line1 ||
        address.line2 ||
        address.city ||
        address.state ||
        address.postalCode)
  );

const addressLines = (address = {}) => {
  const cityState = [address.city, address.state]
    .filter(Boolean)
    .join(", ");

  const cityLine = [cityState, address.postalCode]
    .filter(Boolean)
    .join(" - ");

  return [
    address.line1,
    address.line2,
    cityLine,
    hasAddress(address) ? address.country : "",
  ]
    .map((line) => String(line || "").trim())
    .filter(Boolean);
};

const amountInWords = (amount) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convert = (num) => {
    if (num < 20) return ones[num];

    if (num < 100) {
      return (
        tens[Math.floor(num / 10)] +
        (num % 10 ? ` ${ones[num % 10]}` : "")
      );
    }

    if (num < 1000) {
      return (
        `${ones[Math.floor(num / 100)]} Hundred` +
        (num % 100
          ? ` ${convert(num % 100)}`
          : "")
      );
    }

    if (num < 100000) {
      return (
        `${convert(Math.floor(num / 1000))} Thousand` +
        (num % 1000
          ? ` ${convert(num % 1000)}`
          : "")
      );
    }

    if (num < 10000000) {
      return (
        `${convert(Math.floor(num / 100000))} Lakh` +
        (num % 100000
          ? ` ${convert(num % 100000)}`
          : "")
      );
    }

    return (
      `${convert(Math.floor(num / 10000000))} Crore` +
      (num % 10000000
        ? ` ${convert(num % 10000000)}`
        : "")
    );
  };

  const numeric = Math.max(0, Number(amount || 0));

  const totalPaise = Math.round(numeric * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  let result =
    rupees === 0
      ? "Zero Rupees"
      : `${convert(rupees)} Rupees`;

  if (paise > 0) {
    result += ` and ${convert(paise)} Paise`;
  }

  return `${result} Only`;
};

/*
 * Logo may be a local path, a data URI or an http(s) URL.
 * Any failure just skips the logo.
 */
const loadLogo = async (logo) => {
  if (!logo) return null;

  try {
    if (logo.startsWith("data:image/")) {
      return Buffer.from(logo.split(",")[1] || "", "base64");
    }

    if (/^https?:\/\//i.test(logo)) {
      const response = await fetch(logo, {
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) return null;

      return Buffer.from(await response.arrayBuffer());
    }

    const candidates = [
      logo,
      path.resolve(process.cwd(), logo),
      path.join(process.cwd(), logo.replace(/^[/\\]+/, "")),
    ];

    const found = candidates.find((candidate) =>
      fs.existsSync(candidate)
    );

    return found ? fs.readFileSync(found) : null;
  } catch (error) {
    console.warn(
      "Invoice logo could not be loaded:",
      error.message
    );

    return null;
  }
};

const generateInvoicePdf = async (
  invoice,
  res
) => {
  const company = invoice.companySnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const currency = invoice.currency || "INR";
  const logo = await loadLogo(company.logo);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: MARGIN,
          left: MARGIN,
          right: MARGIN,
          bottom: MARGIN + FOOTER_SPACE,
        },
        bufferPages: true,
        info: {
          Title: `Invoice ${invoice.invoiceNumber || ""}`.trim(),
          Author: company.name || "Ready Tech ERP",
        },
      });

      const filename = `${String(
        invoice.invoiceNumber || "invoice"
      ).replace(/[^\w.-]+/g, "_")}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      doc.on("error", reject);
      doc.pipe(res);

      const left = MARGIN;
      const pageWidth = doc.page.width - MARGIN * 2;
      const right = left + pageWidth;
      const bottomLimit =
        doc.page.height - MARGIN - FOOTER_SPACE;

      let y = MARGIN;

      const ensureSpace = (height, onNewPage) => {
        if (y + height > bottomLimit) {
          doc.addPage();
          y = MARGIN;

          if (onNewPage) onNewPage();
        }
      };

      const setFont = (bold, size, color = COLORS.text) =>
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(size)
          .fillColor(color);

      const hRule = (lineY, color = COLORS.border) => {
        doc
          .save()
          .moveTo(left, lineY)
          .lineTo(right, lineY)
          .lineWidth(0.8)
          .strokeColor(color)
          .stroke()
          .restore();
      };

      /*
       * GST display: CGST + SGST for intra-state, IGST for
       * inter-state/export. A component that is non-zero is always
       * shown so the printed totals add up.
       */
      const isIgstSupply = IGST_SUPPLY_TYPES.includes(
        invoice.supplyType
      );

      const showSplitGst =
        !isIgstSupply ||
        Number(invoice.cgstAmount || 0) > 0 ||
        Number(invoice.sgstAmount || 0) > 0;

      const showIgst =
        isIgstSupply ||
        Number(invoice.igstAmount || 0) > 0;

      /* =====================================================
       * HEADER: logo + company | TAX INVOICE + number
       * ===================================================== */

      let leftY = y;

      if (logo) {
        try {
          doc.image(logo, left, y, {
            fit: [70, 55],
          });
        } catch (error) {
          console.warn(
            "Invoice logo could not be drawn:",
            error.message
          );
        }
      }

      const companyX = logo ? left + 82 : left;
      const companyWidth = 280 - (logo ? 82 : 0);

      setFont(true, 15, COLORS.accent).text(
        company.name || company.legalName || "Company",
        companyX,
        leftY,
        { width: companyWidth }
      );

      leftY = doc.y + 2;

      if (
        company.legalName &&
        company.legalName !== company.name
      ) {
        setFont(false, 8.5).text(
          company.legalName,
          companyX,
          leftY,
          { width: companyWidth }
        );

        leftY = doc.y + 1;
      }

      const companyAddress = addressLines(company.address);

      if (companyAddress.length) {
        setFont(false, 8, COLORS.muted).text(
          companyAddress.join("\n"),
          companyX,
          leftY,
          { width: companyWidth }
        );

        leftY = doc.y + 1;
      }

      const contact = [
        [
          company.phone ? `Phone: ${company.phone}` : "",
          company.email ? `Email: ${company.email}` : "",
        ]
          .filter(Boolean)
          .join("  |  "),
        company.website || "",
      ].filter(Boolean);

      if (contact.length) {
        setFont(false, 8, COLORS.muted).text(
          contact.join("\n"),
          companyX,
          leftY,
          { width: companyWidth }
        );

        leftY = doc.y + 1;
      }

      const registrations = [
        company.gstin ? `GSTIN: ${company.gstin}` : "",
        company.registrationNumber
          ? `Reg. No: ${company.registrationNumber}`
          : "",
      ].filter(Boolean);

      if (registrations.length) {
        setFont(true, 8).text(
          registrations.join("    "),
          companyX,
          leftY,
          { width: companyWidth }
        );

        leftY = doc.y;
      }

      const titleX = right - 200;
      let rightY = y;

      setFont(true, 20, COLORS.accent).text(
        "TAX INVOICE",
        titleX,
        rightY,
        { width: 200, align: "right" }
      );

      rightY = doc.y + 2;

      setFont(true, 10).text(
        `# ${invoice.invoiceNumber || "-"}`,
        titleX,
        rightY,
        { width: 200, align: "right" }
      );

      rightY = doc.y + 4;

      setFont(
        true,
        8,
        STATUS_COLORS[invoice.status] || COLORS.muted
      ).text(
        humanize(invoice.status).toUpperCase(),
        titleX,
        rightY,
        { width: 200, align: "right" }
      );

      rightY = doc.y + 8;

      setFont(false, 8, COLORS.muted).text(
        "Balance Due",
        titleX,
        rightY,
        { width: 200, align: "right" }
      );

      rightY = doc.y + 1;

      setFont(true, 13).text(
        money(invoice.balanceAmount, currency),
        titleX,
        rightY,
        { width: 200, align: "right" }
      );

      rightY = doc.y;

      y = Math.max(leftY, rightY, logo ? y + 55 : y) + 12;

      hRule(y, COLORS.accent);

      y += 12;

      /* =====================================================
       * INVOICE DETAILS
       * ===================================================== */

      const detailsLeft = [
        ["Invoice Date", formatDate(invoice.invoiceDate)],
        ["Due Date", formatDate(invoice.dueDate)],
        ["Reference #", invoice.referenceNumber || "-"],
        ["Payment Method", humanize(invoice.paymentMethod)],
      ];

      const detailsRight = [
        ["Payment Status", humanize(invoice.paymentStatus)],
        ["Place of Supply", invoice.placeOfSupply || "-"],
        [
          "Supply Type",
          SUPPLY_TYPE_LABELS[invoice.supplyType] ||
            humanize(invoice.supplyType),
        ],
        [
          "Reverse Charge",
          invoice.reverseCharge ? "Yes" : "No",
        ],
      ];

      const detailRowHeight = 14;
      const detailsHeight =
        detailsLeft.length * detailRowHeight + 12;
      const halfWidth = (pageWidth - 12) / 2;

      doc
        .save()
        .roundedRect(left, y, pageWidth, detailsHeight, 4)
        .fill(COLORS.panel)
        .restore();

      [detailsLeft, detailsRight].forEach((rows, column) => {
        const columnX =
          left + 10 + column * (halfWidth + 12);

        rows.forEach(([label, value], index) => {
          const rowY = y + 6 + index * detailRowHeight;

          setFont(false, 8, COLORS.muted).text(
            label,
            columnX,
            rowY,
            { width: 95, lineBreak: false }
          );

          setFont(true, 8).text(
            String(value),
            columnX + 95,
            rowY,
            {
              width: halfWidth - 110,
              lineBreak: false,
              ellipsis: true,
            }
          );
        });
      });

      y += detailsHeight + 14;

      /* =====================================================
       * BILL TO / SHIP TO
       * ===================================================== */

      const billingAddress = hasAddress(invoice.billingAddress)
        ? invoice.billingAddress
        : customer.billingAddress || {};

      const shippingAddress = hasAddress(invoice.shippingAddress)
        ? invoice.shippingAddress
        : customer.shippingAddress || billingAddress;

      const partyBlocks = [
        {
          title: "BILL TO",
          name: customer.name || "-",
          lines: [
            customer.companyName,
            ...addressLines(billingAddress),
            customer.phone ? `Phone: ${customer.phone}` : "",
            customer.email ? `Email: ${customer.email}` : "",
          ],
          gstin: customer.gstin,
        },
        {
          title: "SHIP TO",
          name:
            shippingAddress.name ||
            customer.name ||
            "-",
          lines: addressLines(shippingAddress),
          gstin: "",
        },
      ];

      ensureSpace(90);

      const partyStartY = y;
      let partyEndY = y;

      partyBlocks.forEach((block, column) => {
        const blockX = left + column * (halfWidth + 12);
        let blockY = partyStartY;

        setFont(true, 7.5, COLORS.muted).text(
          block.title,
          blockX,
          blockY,
          { width: halfWidth, characterSpacing: 0.8 }
        );

        blockY = doc.y + 3;

        setFont(true, 9.5).text(block.name, blockX, blockY, {
          width: halfWidth,
        });

        blockY = doc.y + 1;

        const lines = block.lines.filter(Boolean);

        if (lines.length) {
          setFont(false, 8, COLORS.muted).text(
            lines.join("\n"),
            blockX,
            blockY,
            { width: halfWidth }
          );

          blockY = doc.y + 1;
        }

        if (block.gstin) {
          setFont(true, 8).text(
            `GSTIN: ${block.gstin}`,
            blockX,
            blockY,
            { width: halfWidth }
          );

          blockY = doc.y;
        }

        partyEndY = Math.max(partyEndY, blockY);
      });

      y = partyEndY + 14;

      /* =====================================================
       * ITEMS TABLE
       * ===================================================== */

      const taxColumns = [];

      if (showSplitGst) {
        taxColumns.push(
          { key: "cgst", label: "CGST", width: showIgst ? 40 : 44, align: "right" },
          { key: "sgst", label: "SGST", width: showIgst ? 40 : 44, align: "right" }
        );
      }

      if (showIgst) {
        taxColumns.push({
          key: "igst",
          label: "IGST",
          width: showSplitGst ? 40 : 88,
          align: "right",
        });
      }

      const fixedColumns = [
        { key: "sno", label: "#", width: 14, align: "center" },
        { key: "item", label: "Item & Description", width: 0 },
        { key: "hsn", label: "HSN/SAC", width: 40 },
        { key: "qty", label: "Qty", width: 34, align: "right" },
        { key: "rate", label: "Rate", width: 48, align: "right" },
        { key: "gross", label: "Gross", width: 50, align: "right" },
        { key: "disc", label: "Discount", width: 42, align: "right" },
        { key: "taxable", label: "Taxable", width: 52, align: "right" },
        ...taxColumns,
        { key: "total", label: "Amount", width: 54, align: "right" },
      ];

      const usedWidth = fixedColumns.reduce(
        (sum, column) => sum + column.width,
        0
      );

      const columns = fixedColumns.map((column) =>
        column.key === "item"
          ? { ...column, width: pageWidth - usedWidth }
          : column
      );

      const CELL_PADDING = 3;

      const measureParts = (parts, width) =>
        parts.reduce((height, part) => {
          if (!part.text) return height;

          setFont(part.bold, part.size || 7);

          return (
            height +
            doc.heightOfString(String(part.text), {
              width: width - CELL_PADDING * 2,
            }) +
            1
          );
        }, 0);

      const drawParts = (parts, x, cellY, width, align) => {
        let partY = cellY;

        parts.forEach((part) => {
          if (!part.text) return;

          setFont(
            part.bold,
            part.size || 7,
            part.color || COLORS.text
          ).text(String(part.text), x + CELL_PADDING, partY, {
            width: width - CELL_PADDING * 2,
            align: align || "left",
          });

          partY = doc.y + 1;
        });
      };

      const drawTableHeader = () => {
        const headerHeight = 20;

        doc
          .save()
          .rect(left, y, pageWidth, headerHeight)
          .fill(COLORS.accent)
          .restore();

        let x = left;

        columns.forEach((column) => {
          setFont(true, 7, COLORS.white).text(
            column.label,
            x + CELL_PADDING,
            y + 6.5,
            {
              width: column.width - CELL_PADDING * 2,
              align: column.align || "left",
              lineBreak: false,
            }
          );

          x += column.width;
        });

        y += headerHeight;
      };

      const taxCell = (rate, amount) => [
        { text: formatNumber(amount) },
        { text: formatRate(rate), size: 6, color: COLORS.muted },
      ];

      const buildRowCells = (item, index) => {
        const codes = [
          item.sku ? `SKU: ${item.sku}` : "",
          item.productCode && item.productCode !== item.sku
            ? `Code: ${item.productCode}`
            : "",
        ]
          .filter(Boolean)
          .join("  ");

        const grossAmount =
          item.grossAmount ||
          Number(item.quantity || 0) * Number(item.unitPrice || 0);

        return {
          sno: [{ text: index + 1 }],
          item: [
            { text: item.name || "Item", bold: true, size: 7.5 },
            { text: item.description, size: 6.5, color: COLORS.muted },
            { text: codes, size: 6.5, color: COLORS.muted },
          ],
          hsn: [{ text: item.hsnSac || "-" }],
          qty: [
            { text: formatQuantity(item.quantity) },
            { text: item.unit, size: 6, color: COLORS.muted },
          ],
          rate: [{ text: formatNumber(item.unitPrice) }],
          gross: [{ text: formatNumber(grossAmount) }],
          disc: [
            { text: formatNumber(item.discountAmount) },
            {
              text:
                item.discountAmount > 0 &&
                item.discountType === "percentage"
                  ? formatRate(item.discountValue)
                  : "",
              size: 6,
              color: COLORS.muted,
            },
          ],
          taxable: [{ text: formatNumber(item.taxableAmount) }],
          cgst: taxCell(item.cgstRate, item.cgstAmount),
          sgst: taxCell(item.sgstRate, item.sgstAmount),
          igst: taxCell(item.igstRate, item.igstAmount),
          total: [{ text: formatNumber(item.lineTotal), bold: true }],
        };
      };

      setFont(false, 7, COLORS.muted).text(
        `Amounts in ${currencyPrefix(currency)}`,
        left,
        y,
        { width: pageWidth, align: "right" }
      );

      y = doc.y + 2;

      drawTableHeader();

      (invoice.items || []).forEach((item, index) => {
        const cells = buildRowCells(item, index);

        const rowHeight = Math.max(
          20,
          ...columns.map(
            (column) =>
              measureParts(cells[column.key], column.width) + 8
          )
        );

        ensureSpace(rowHeight, drawTableHeader);

        if (index % 2 === 1) {
          doc
            .save()
            .rect(left, y, pageWidth, rowHeight)
            .fill(COLORS.zebra)
            .restore();
        }

        let x = left;

        columns.forEach((column) => {
          drawParts(
            cells[column.key],
            x,
            y + 4,
            column.width,
            column.align
          );

          x += column.width;
        });

        y += rowHeight;

        hRule(y);
      });

      y += 12;

      /* =====================================================
       * TOTALS (right) + AMOUNT IN WORDS (left)
       * ===================================================== */

      const rates = [
        ...new Set(
          (invoice.items || [])
            .map((item) => Number(item.gstRate || 0))
            .filter((rate) => rate > 0)
        ),
      ];

      // Single GST rate: label with the rate. Mixed rates are already
      // shown per line in the item table, so only totals are listed.
      const rateSuffix = (divisor) =>
        rates.length === 1
          ? ` @ ${formatRate(rates[0] / divisor)}`
          : "";

      const taxRows = [];

      if (showSplitGst) {
        taxRows.push(
          [`CGST${rateSuffix(2)}`, money(invoice.cgstAmount, currency)],
          [`SGST${rateSuffix(2)}`, money(invoice.sgstAmount, currency)]
        );
      }

      if (showIgst) {
        taxRows.push([
          `IGST${rateSuffix(1)}`,
          money(invoice.igstAmount, currency),
        ]);
      }

      const roundOff = Number(invoice.roundOff || 0);

      const totalRows = [
        ["Sub Total", money(invoice.subtotal, currency)],
        [
          "Total Discount",
          `(-) ${money(invoice.totalDiscount, currency)}`,
        ],
        ["Taxable Amount", money(invoice.taxableAmount, currency)],
        ...taxRows,
        ["Total Tax", money(invoice.totalTax, currency), true],
        ["Shipping Charges", money(invoice.shippingCharges, currency)],
        ["Other Charges", money(invoice.otherCharges, currency)],
        [
          "Round Off",
          `${roundOff < 0 ? "(-)" : "(+)"} ${money(
            Math.abs(roundOff),
            currency
          )}`,
        ],
      ];

      const totalsWidth = 240;
      const totalsX = right - totalsWidth;
      const totalRowHeight = 14;
      const totalsHeight =
        totalRows.length * totalRowHeight + 26 + 2 * totalRowHeight + 20;

      ensureSpace(totalsHeight);

      const sectionY = y;
      let totalsY = y;

      totalRows.forEach(([label, value, bold]) => {
        setFont(Boolean(bold), 8, bold ? COLORS.text : COLORS.muted).text(
          label,
          totalsX,
          totalsY,
          { width: 140, lineBreak: false }
        );

        setFont(Boolean(bold), 8).text(value, totalsX + 140, totalsY, {
          width: totalsWidth - 140,
          align: "right",
          lineBreak: false,
        });

        totalsY += totalRowHeight;
      });

      totalsY += 2;

      doc
        .save()
        .rect(totalsX, totalsY, totalsWidth, 24)
        .fill(COLORS.accent)
        .restore();

      setFont(true, 10.5, COLORS.white).text(
        "GRAND TOTAL",
        totalsX + 8,
        totalsY + 7,
        { width: 120, lineBreak: false }
      );

      setFont(true, 10.5, COLORS.white).text(
        money(invoice.grandTotal, currency),
        totalsX + 110,
        totalsY + 7,
        {
          width: totalsWidth - 118,
          align: "right",
          lineBreak: false,
        }
      );

      totalsY += 30;

      [
        ["Paid Amount", `(-) ${money(invoice.paidAmount, currency)}`, false],
        ["Balance Due", money(invoice.balanceAmount, currency), true],
      ].forEach(([label, value, bold]) => {
        setFont(bold, bold ? 9 : 8, bold ? COLORS.text : COLORS.muted).text(
          label,
          totalsX,
          totalsY,
          { width: 140, lineBreak: false }
        );

        setFont(bold, bold ? 9 : 8).text(value, totalsX + 140, totalsY, {
          width: totalsWidth - 140,
          align: "right",
          lineBreak: false,
        });

        totalsY += totalRowHeight + 1;
      });

      const wordsWidth = pageWidth - totalsWidth - 24;
      let wordsY = sectionY;

      setFont(true, 8, COLORS.muted).text(
        "Total in Words",
        left,
        wordsY,
        { width: wordsWidth }
      );

      wordsY = doc.y + 2;

      // Always derived from grandTotal so it can never disagree with it.
      setFont(true, 8.5).text(
        amountInWords(invoice.grandTotal),
        left,
        wordsY,
        { width: wordsWidth }
      );

      wordsY = doc.y + 10;

      setFont(true, 8, COLORS.muted).text(
        "Payment",
        left,
        wordsY,
        { width: wordsWidth }
      );

      wordsY = doc.y + 2;

      setFont(false, 8).text(
        `Method: ${humanize(invoice.paymentMethod)}    Status: ${humanize(
          invoice.paymentStatus
        )}`,
        left,
        wordsY,
        { width: wordsWidth }
      );

      wordsY = doc.y + 14;

      /* =====================================================
       * NOTES / TERMS
       * Beside the totals when they fit, otherwise full width below.
       * ===================================================== */

      const noteBlocks = [
        ["Notes", invoice.notes],
        ["Terms & Conditions", invoice.termsAndConditions],
      ].filter(([, body]) => body);

      const measureNotes = (width) =>
        noteBlocks.reduce((height, [title, body]) => {
          setFont(true, 9);
          const titleHeight = doc.heightOfString(title, { width });
          setFont(false, 8);
          return (
            height +
            titleHeight +
            3 +
            doc.heightOfString(body, { width }) +
            12
          );
        }, 0);

      const drawNotes = (x, width) => {
        noteBlocks.forEach(([title, body]) => {
          ensureSpace(40);

          setFont(true, 9).text(title, x, y, { width });

          setFont(false, 8, COLORS.muted).text(
            body,
            x,
            doc.y + 3,
            { width }
          );

          y = doc.y + 12;
        });
      };

      if (
        noteBlocks.length &&
        wordsY + measureNotes(wordsWidth) <= bottomLimit
      ) {
        y = wordsY;
        drawNotes(left, wordsWidth);
        y = Math.max(totalsY + 6, y);
      } else {
        y = Math.max(totalsY, wordsY) + 14;
        drawNotes(left, pageWidth);
      }

      /* =====================================================
       * SIGNATURE
       * ===================================================== */

      ensureSpace(44);

      const signX = right - 200;

      setFont(false, 8, COLORS.muted).text(
        `For ${company.legalName || company.name || "Company"}`,
        signX,
        y,
        { width: 200, align: "right" }
      );

      const signLineY = y + 28;

      doc
        .save()
        .moveTo(signX + 60, signLineY)
        .lineTo(right, signLineY)
        .lineWidth(0.6)
        .strokeColor(COLORS.light)
        .stroke()
        .restore();

      setFont(false, 8).text(
        "Authorised Signatory",
        signX,
        signLineY + 4,
        { width: 200, align: "right" }
      );

      /* =====================================================
       * FOOTER + PAGE NUMBERS (every page)
       * ===================================================== */

      const range = doc.bufferedPageRange();

      for (
        let pageIndex = range.start;
        pageIndex < range.start + range.count;
        pageIndex += 1
      ) {
        doc.switchToPage(pageIndex);

        // Footer sits inside the reserved bottom area.
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const footerY = doc.page.height - MARGIN - 18;

        hRule(footerY);

        setFont(false, 7, COLORS.light).text(
          `This is a computer-generated invoice  •  ${
            invoice.invoiceNumber || ""
          }  •  Generated by Ready Tech ERP`,
          left,
          footerY + 6,
          { width: pageWidth - 80, lineBreak: false }
        );

        setFont(false, 7, COLORS.light).text(
          `Page ${pageIndex - range.start + 1} of ${range.count}`,
          right - 80,
          footerY + 6,
          { width: 80, align: "right", lineBreak: false }
        );

        doc.page.margins.bottom = originalBottom;
      }

      doc.end();

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePdf,
  amountInWords,
};
