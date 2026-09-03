export const printQRCodesWindow = (itemsToPrint) => {
    if (!itemsToPrint || itemsToPrint.length === 0) {
        alert("Brak kodów do wydruku!");
        return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert("Przeglądarka zablokowała wyskakujące okno. Zezwól na pop-upy dla tej strony.");
        return;
    }

    const cardsHtml = itemsToPrint.map(qr => {
        const cardElement = document.getElementById(`qr-card-${qr.id}`);
        const svgElement = cardElement ? cardElement.querySelector('svg') : null;
        const svgHtml = svgElement ? svgElement.outerHTML : '';

        return `
            <div class="qr-card">
                <h2>Stolik ${qr.tableNumber}</h2>
                <div class="qr-svg-wrapper">
                    ${svgHtml}
                </div>
            </div>
        `;
    }).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <title>Drukuj Kody QR</title>
            <style>
                @page {
                    size: A4;
                    margin: 10mm;
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #ffffff;
                    padding: 10mm;
                }
                .qr-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12mm;
                    justify-content: flex-start;
                }
                .qr-card {
                    width: 55mm;
                    padding: 8mm 4mm;
                    border: 2px dashed #9ca3af;
                    border-radius: 6px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .qr-card h2 {
                    font-size: 16pt;
                    margin-bottom: 5mm;
                    color: #111827;
                }
                .qr-svg-wrapper svg {
                    width: 44mm !important;
                    height: 44mm !important;
                    display: block;
                }
            </style>
        </head>
        <body>
            <div class="qr-container">
                ${cardsHtml}
            </div>
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};