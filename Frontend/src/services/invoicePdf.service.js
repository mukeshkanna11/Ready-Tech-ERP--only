const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const formatCurrency = (value = 0) => {
  const number = Number(value || 0);

  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const safeText = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const drawLine = (
  doc,
  x1,
  y1,
  x2,
  y2,
  width = 0.6
) => {
  doc
    .save()
    .lineWidth(width)
    .moveTo(x1, y1)
    .lineTo(x2, y2)
    .stroke("#D8DEE8")
    .restore();
};

const drawRoundedBox = (
  doc,
  x,
  y,
  width,
  height
) => {
  doc
    .save()
    .lineWidth(0.7)
    .roundedRect(
      x,
      y,
      width,
      height,
      7
    )
    .stroke("#D8DEE8")
    .restore();
};

const drawLabel = (
  doc,
  text,
  x,
  y
) => {
  doc
    .fontSize(7)
    .fillColor("#7B8494")
    .font("Helvetica-Bold")
    .text(
      safeText(text).toUpperCase(),
      x,
      y
    );
};

const drawValue = (
  doc,
  text,
  x,
  y,
  options = {}
) => {
  doc
    .fontSize(
      options.size || 9
    )
    .fillColor(
      options.color || "#182235"
    )
    .font(
      options.bold
        ? "Helvetica-Bold"
        : "Helvetica"
    )
    .text(
      safeText(text),
      x,
      y,
      {
        width:
          options.width || 150,
        lineGap: 2,
      }
    );
};

const buildInvoicePdf = (
  invoice,
  outputPath
) => {
  return new Promise(
    (resolve, reject) => {
      const doc =
        new PDFDocument({
          size: "A4",
          margin: 0,
          bufferPages: true,
          info: {
            Title:
              invoice.invoiceNumber ||
              "Invoice",
            Author:
              invoice.companySnapshot
                ?.name ||
              "Ready Tech Solutions",
            Subject:
              "Tax Invoice",
          },
        });

      const stream =
        fs.createWriteStream(
          outputPath
        );

      doc.pipe(stream);

      const pageWidth =
        doc.page.width;

      const pageHeight =
        doc.page.height;

      const margin = 38;

      const contentWidth =
        pageWidth -
        margin * 2;

      const company =
        invoice.companySnapshot ||
        {};

      const customer =
        invoice.customerSnapshot ||
        {};

      const billing =
        invoice.billingAddress ||
        customer.billingAddress ||
        {};

      const shipping =
        invoice.shippingAddress ||
        customer.shippingAddress ||
        {};

      /*
       * Premium header
       */

      doc
        .rect(
          0,
          0,
          pageWidth,
          112
        )
        .fill("#0B1220");

      const logoPath = path.join(
  process.cwd(),
  "assets",
  "Logo.jpg"
);

const hasLogo =
  fs.existsSync(logoPath);

if (hasLogo) {
  try {
    doc.image(
      logoPath,
      margin,
      25,
      {
        fit: [
          100,
          55,
        ],
      }
    );
  } catch (error) {
    console.error(
      "Invoice logo error:",
      error.message
    );
  }
}

      const companyX =
        logoPath &&
        fs.existsSync(logoPath)
          ? margin + 115
          : margin;

      doc
        .fontSize(17)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(
          safeText(
            company.name ||
              company.legalName ||
              "Ready Tech Solutions"
          ),
          companyX,
          27,
          {
            width: 260,
          }
        );

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#AAB5C7")
        .text(
          safeText(
            company.legalName || ""
          ),
          companyX,
          49,
          {
            width: 260,
          }
        );

      doc
        .fontSize(7.5)
        .text(
          [
            company.email,
            company.phone,
          ]
            .filter(Boolean)
            .join("  •  "),
          companyX,
          66,
          {
            width: 280,
          }
        );

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(
          "TAX INVOICE",
          pageWidth -
            margin -
            150,
          28,
          {
            width: 150,
            align: "right",
          }
        );

      doc
        .fontSize(11)
        .text(
          safeText(
            invoice.invoiceNumber
          ),
          pageWidth -
            margin -
            150,
          49,
          {
            width: 150,
            align: "right",
          }
        );

      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor("#AAB5C7")
        .text(
          `Invoice Date: ${formatDate(
            invoice.invoiceDate
          )}`,
          pageWidth -
            margin -
            150,
          70,
          {
            width: 150,
            align: "right",
          }
        );

      /*
       * Company GST
       */

      let y = 130;

      drawRoundedBox(
        doc,
        margin,
        y,
        contentWidth,
        66
      );

      drawLabel(
        doc,
        "Company Details",
        margin + 12,
        y + 10
      );

      drawValue(
        doc,
        company.address
          ? [
              company.address.line1,
              company.address.city,
              company.address.state,
              company.address.country,
              company.address.postalCode,
            ]
              .filter(Boolean)
              .join(", ")
          : "-",
        margin + 12,
        y + 27,
        {
          width: 300,
        }
      );

      drawLabel(
        doc,
        "GSTIN",
        margin + 340,
        y + 10
      );

      drawValue(
        doc,
        company.gstin || "-",
        margin + 340,
        y + 27,
        {
          width: 100,
          bold: true,
        }
      );

      drawLabel(
        doc,
        "Currency",
        margin + 455,
        y + 10
      );

      drawValue(
        doc,
        invoice.currency ||
          "INR",
        margin + 455,
        y + 27,
        {
          width: 70,
          bold: true,
        }
      );

      /*
       * Bill / Ship
       */

      y += 82;

      const boxGap = 10;

      const boxWidth =
        (contentWidth -
          boxGap) /
        2;

      drawRoundedBox(
        doc,
        margin,
        y,
        boxWidth,
        112
      );

      drawRoundedBox(
        doc,
        margin +
          boxWidth +
          boxGap,
        y,
        boxWidth,
        112
      );

      drawLabel(
        doc,
        "Bill To",
        margin + 12,
        y + 11
      );

      drawValue(
        doc,
        customer.name ||
          customer.companyName ||
          "-",
        margin + 12,
        y + 28,
        {
          width:
            boxWidth - 24,
          bold: true,
        }
      );

      drawValue(
        doc,
        customer.companyName || "",
        margin + 12,
        y + 45,
        {
          width:
            boxWidth - 24,
        }
      );

      drawValue(
        doc,
        customer.email || "",
        margin + 12,
        y + 61,
        {
          width:
            boxWidth - 24,
        }
      );

      drawValue(
        doc,
        customer.phone || "",
        margin + 12,
        y + 77,
        {
          width:
            boxWidth - 24,
        }
      );

      drawValue(
        doc,
        `GSTIN: ${
          customer.gstin || "-"
        }`,
        margin + 12,
        y + 93,
        {
          width:
            boxWidth - 24,
        }
      );

      const shipX =
        margin +
        boxWidth +
        boxGap;

      drawLabel(
        doc,
        "Shipping Address",
        shipX + 12,
        y + 11
      );

      drawValue(
        doc,
        [
          shipping.line1,
          shipping.line2,
          shipping.city,
          shipping.state,
          shipping.country,
          shipping.postalCode,
        ]
          .filter(Boolean)
          .join(", ") || "-",
        shipX + 12,
        y + 30,
        {
          width:
            boxWidth - 24,
        }
      );

      /*
       * Invoice meta
       */

      y += 128;

      const metaWidth =
        contentWidth / 4;

      const metadata = [
        [
          "Due Date",
          formatDate(
            invoice.dueDate
          ),
        ],
        [
          "Place Of Supply",
          invoice.placeOfSupply ||
            "-",
        ],
        [
          "Supply Type",
          invoice.supplyType ===
          "inter_state"
            ? "Inter-State"
            : "Intra-State",
        ],
        [
          "Payment Method",
          String(
            invoice.paymentMethod ||
              "credit"
          )
            .replaceAll(
              "_",
              " "
            )
            .toUpperCase(),
        ],
      ];

      metadata.forEach(
        ([label, value], index) => {
          const x =
            margin +
            index *
              metaWidth;

          drawLabel(
            doc,
            label,
            x,
            y
          );

          drawValue(
            doc,
            value,
            x,
            y + 15,
            {
              width:
                metaWidth - 10,
              bold: true,
            }
          );
        }
      );

      /*
       * Item table
       */

      y += 40;

      const columns = [
        {
          key: "index",
          title: "#",
          width: 24,
        },
        {
          key: "item",
          title: "ITEM",
          width: 190,
        },
        {
          key: "hsn",
          title: "HSN/SAC",
          width: 58,
        },
        {
          key: "qty",
          title: "QTY",
          width: 42,
        },
        {
          key: "rate",
          title: "RATE",
          width: 72,
        },
        {
          key: "discount",
          title: "DISC.",
          width: 60,
        },
        {
          key: "taxable",
          title: "TAXABLE",
          width: 72,
        },
        {
          key: "total",
          title: "TOTAL",
          width:
            contentWidth -
            24 -
            190 -
            58 -
            42 -
            72 -
            60 -
            72,
        },
      ];

      const headerHeight =
        27;

      doc
        .roundedRect(
          margin,
          y,
          contentWidth,
          headerHeight,
          5
        )
        .fill("#172033");

      let columnX = margin;

      columns.forEach(
        (column) => {
          doc
            .fontSize(6.5)
            .font(
              "Helvetica-Bold"
            )
            .fillColor("#DCE5F1")
            .text(
              column.title,
              columnX + 6,
              y + 9,
              {
                width:
                  column.width - 12,
                align:
                  column.key ===
                    "qty" ||
                  [
                    "rate",
                    "discount",
                    "taxable",
                    "total",
                  ].includes(
                    column.key
                  )
                    ? "right"
                    : "left",
              }
            );

          columnX +=
            column.width;
        }
      );

      y += headerHeight;

      const items =
        invoice.items || [];

      items.forEach(
        (item, index) => {
          const rowHeight =
            item.description
              ? 43
              : 35;

          if (
            y + rowHeight >
            pageHeight - 190
          ) {
            doc.addPage();

            y = margin;

            doc
              .fontSize(8)
              .font(
                "Helvetica-Bold"
              )
              .fillColor("#172033")
              .text(
                "INVOICE CONTINUED",
                margin,
                y
              );

            y += 25;
          }

          if (index % 2 === 0) {
            doc
              .rect(
                margin,
                y,
                contentWidth,
                rowHeight
              )
              .fill("#F7F9FC");
          }

          columnX = margin;

          const itemName =
            item.name || "-";

          doc
            .fontSize(8)
            .font(
              "Helvetica-Bold"
            )
            .fillColor("#172033")
            .text(
              String(index + 1),
              columnX + 6,
              y + 10,
              {
                width:
                  columns[0]
                    .width - 12,
              }
            );

          columnX +=
            columns[0].width;

          doc
            .fontSize(7.5)
            .font(
              "Helvetica-Bold"
            )
            .fillColor("#172033")
            .text(
              itemName,
              columnX + 6,
              y + 7,
              {
                width:
                  columns[1]
                    .width - 12,
              }
            );

          if (item.sku) {
            doc
              .fontSize(6.5)
              .font("Helvetica")
              .fillColor("#7B8494")
              .text(
                item.sku,
                columnX + 6,
                y + 21,
                {
                  width:
                    columns[1]
                      .width - 12,
                }
              );
          }

          columnX +=
            columns[1].width;

          doc
            .fontSize(7)
            .fillColor("#445066")
            .font("Helvetica")
            .text(
              item.hsnSac || "-",
              columnX + 5,
              y + 11,
              {
                width:
                  columns[2]
                    .width - 10,
              }
            );

          columnX +=
            columns[2].width;

          doc.text(
            String(
              item.quantity || 0
            ),
            columnX + 4,
            y + 11,
            {
              width:
                columns[3]
                  .width - 8,
              align: "right",
            }
          );

          columnX +=
            columns[3].width;

          doc.text(
            formatCurrency(
              item.unitPrice
            ),
            columnX + 4,
            y + 11,
            {
              width:
                columns[4]
                  .width - 8,
              align: "right",
            }
          );

          columnX +=
            columns[4].width;

          doc.text(
            formatCurrency(
              item.discountAmount
            ),
            columnX + 4,
            y + 11,
            {
              width:
                columns[5]
                  .width - 8,
              align: "right",
            }
          );

          columnX +=
            columns[5].width;

          doc.text(
            formatCurrency(
              item.taxableAmount
            ),
            columnX + 4,
            y + 11,
            {
              width:
                columns[6]
                  .width - 8,
              align: "right",
            }
          );

          columnX +=
            columns[6].width;

          doc
            .font("Helvetica-Bold")
            .fillColor("#172033")
            .text(
              formatCurrency(
                item.lineTotal
              ),
              columnX + 4,
              y + 11,
              {
                width:
                  columns[7]
                    .width - 8,
                align: "right",
              }
            );

          y += rowHeight;

          drawLine(
            doc,
            margin,
            y,
            margin +
              contentWidth
          );
        }
      );

      /*
       * Tax breakdown
       */

      y += 18;

      const taxBoxWidth =
        contentWidth * 0.54;

      drawRoundedBox(
        doc,
        margin,
        y,
        taxBoxWidth,
        86
      );

      drawLabel(
        doc,
        "GST Summary",
        margin + 12,
        y + 10
      );

      const taxRows = [
        [
          "Taxable Amount",
          invoice.taxableAmount,
        ],
        [
          "CGST",
          invoice.cgstAmount,
        ],
        [
          "SGST",
          invoice.sgstAmount,
        ],
        [
          "IGST",
          invoice.igstAmount,
        ],
      ];

      taxRows.forEach(
        ([label, value], index) => {
          const rowY =
            y +
            27 +
            index * 13;

          doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor("#596579")
            .text(
              label,
              margin + 12,
              rowY
            );

          doc
            .fontSize(7)
            .font(
              "Helvetica-Bold"
            )
            .fillColor("#172033")
            .text(
              formatCurrency(
                value
              ),
              margin +
                taxBoxWidth -
                100,
              rowY,
              {
                width: 88,
                align: "right",
              }
            );
        }
      );

      /*
       * Grand total box
       */

      const totalBoxWidth =
        contentWidth -
        taxBoxWidth -
        10;

      const totalX =
        margin +
        taxBoxWidth +
        10;

      drawRoundedBox(
        doc,
        totalX,
        y,
        totalBoxWidth,
        132
      );

      const summaryRows = [
        [
          "Subtotal",
          invoice.subtotal,
        ],
        [
          "Discount",
          -Number(
            invoice.totalDiscount ||
              0
          ),
        ],
        [
          "Tax",
          invoice.totalTax,
        ],
        [
          "Shipping",
          invoice.shippingCharges,
        ],
        [
          "Other Charges",
          invoice.otherCharges,
        ],
        [
          "Round Off",
          invoice.roundOff,
        ],
      ];

      summaryRows.forEach(
        ([label, value], index) => {
          const rowY =
            y +
            12 +
            index * 14;

          doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor("#687386")
            .text(
              label,
              totalX + 10,
              rowY
            );

          doc
            .fontSize(7)
            .font(
              "Helvetica-Bold"
            )
            .fillColor("#172033")
            .text(
              formatCurrency(
                value
              ),
              totalX +
                totalBoxWidth -
                100,
              rowY,
              {
                width: 90,
                align: "right",
              }
            );
        }
      );

      drawLine(
        doc,
        totalX + 10,
        y + 96,
        totalX +
          totalBoxWidth -
          10,
        y + 96,
        1
      );

      doc
        .fontSize(10)
        .font(
          "Helvetica-Bold"
        )
        .fillColor("#0B1220")
        .text(
          "GRAND TOTAL",
          totalX + 10,
          y + 106
        );

      doc
        .fontSize(12)
        .text(
          formatCurrency(
            invoice.grandTotal
          ),
          totalX +
            totalBoxWidth -
            125,
          y + 104,
          {
            width: 115,
            align: "right",
          }
        );

      /*
       * Payment status
       */

      y += 151;

      drawRoundedBox(
        doc,
        margin,
        y,
        contentWidth,
        48
      );

      drawLabel(
        doc,
        "Payment Status",
        margin + 12,
        y + 9
      );

      drawValue(
        doc,
        String(
          invoice.paymentStatus ||
            "unpaid"
        )
          .replaceAll(
            "_",
            " "
          )
          .toUpperCase(),
        margin + 12,
        y + 25,
        {
          width: 130,
          bold: true,
        }
      );

      drawLabel(
        doc,
        "Paid Amount",
        margin + 180,
        y + 9
      );

      drawValue(
        doc,
        formatCurrency(
          invoice.paidAmount
        ),
        margin + 180,
        y + 25,
        {
          width: 120,
          bold: true,
        }
      );

      drawLabel(
        doc,
        "Balance Amount",
        margin + 330,
        y + 9
      );

      drawValue(
        doc,
        formatCurrency(
          invoice.balanceAmount
        ),
        margin + 330,
        y + 25,
        {
          width: 130,
          bold: true,
        }
      );

      /*
       * Notes
       */

      y += 66;

      const notesWidth =
        contentWidth / 2 - 6;

      drawRoundedBox(
        doc,
        margin,
        y,
        notesWidth,
        75
      );

      drawRoundedBox(
        doc,
        margin +
          notesWidth +
          12,
        y,
        notesWidth,
        75
      );

      drawLabel(
        doc,
        "Notes",
        margin + 12,
        y + 10
      );

      drawValue(
        doc,
        invoice.notes || "-",
        margin + 12,
        y + 27,
        {
          width:
            notesWidth - 24,
          size: 7.5,
        }
      );

      drawLabel(
        doc,
        "Terms & Conditions",
        margin +
          notesWidth +
          24,
        y + 10
      );

      drawValue(
        doc,
        invoice.termsAndConditions ||
          "-",
        margin +
          notesWidth +
          24,
        y + 27,
        {
          width:
            notesWidth - 24,
          size: 7.5,
        }
      );

      /*
       * Footer
       */

      const footerY =
        pageHeight - 38;

      drawLine(
        doc,
        margin,
        footerY - 10,
        pageWidth - margin,
        footerY - 10
      );

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor("#7B8494")
        .text(
          "Thank you for your business.",
          margin,
          footerY,
          {
            width: 250,
          }
        );

      doc
        .text(
          safeText(
            company.name ||
              "Ready Tech Solutions"
          ),
          pageWidth -
            margin -
            200,
          footerY,
          {
            width: 200,
            align: "right",
          }
        );

      /*
       * Page numbers
       */

      const pages =
        doc.bufferedPageRange();

      for (
        let index = 0;
        index < pages.count;
        index++
      ) {
        doc.switchToPage(
          pages.start + index
        );

        doc
          .fontSize(6.5)
          .fillColor("#9AA3B1")
          .text(
            `Page ${
              index + 1
            } of ${pages.count}`,
            pageWidth / 2 -
              30,
            footerY,
            {
              width: 60,
              align: "center",
            }
          );
      }

      doc.end();

      stream.on(
        "finish",
        () => resolve(outputPath)
      );

      stream.on(
        "error",
        reject
      );
    }
  );
};

module.exports = {
  buildInvoicePdf,
};