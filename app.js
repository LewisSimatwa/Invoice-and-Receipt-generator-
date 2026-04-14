/* ============================================================
   De'Kodao Agencies – Receipt & Invoice Generator
   app.js
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let docType   = 'receipt';
let currency  = 'USD';          // 'USD' | 'KSH'
let logoDataUrl = '';

// ── Currency helpers ─────────────────────────────────────────
const CURRENCY_CONFIG = {
    USD: { symbol: '$',    code: 'USD', label: 'USD',  step: 0.01 },
    KSH: { symbol: 'Ksh ', code: 'KSH', label: 'KSH',  step: 1    },
};

function currencySymbol()  { return CURRENCY_CONFIG[currency].symbol; }
function currencyLabel()   { return CURRENCY_CONFIG[currency].label;  }
function currencyStep()    { return CURRENCY_CONFIG[currency].step;   }

function formatAmount(value) {
    const num = parseFloat(value) || 0;
    if (currency === 'KSH') {
        return 'Ksh ' + num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + num.toFixed(2);
}

// ── Initialisation ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('docDate').valueAsDate = new Date();
    loadLogo();
    attachItemListeners(document.querySelector('.item-row'));
});

function loadLogo() {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = logoImg.width;
        canvas.height = logoImg.height;
        canvas.getContext('2d').drawImage(logoImg, 0, 0);
        logoDataUrl = canvas.toDataURL('image/png');
    };
    logoImg.onerror = () => console.warn('Logo image failed to load');
    logoImg.src = 'logo.jpeg';
}

// ── Document-type selector ───────────────────────────────────
function selectDocType(type, btn) {
    docType = type;
    document.querySelectorAll('.doc-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('invoiceDueDate').style.display = (type === 'invoice') ? 'grid' : 'none';
}

// ── Currency selector ────────────────────────────────────────
function selectCurrency(selected, btn) {
    currency = selected;

    // Update buttons
    document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update column headers
    document.getElementById('headerCurrency').textContent      = currencyLabel();
    document.getElementById('headerCurrencyTotal').textContent = currencyLabel();

    // Update price input steps
    document.querySelectorAll('.item-price, .item-qty').forEach(input => {
        if (input.classList.contains('item-price')) {
            input.step = currencyStep();
        }
    });

    // Recalculate with new symbol
    calculateTotals();
}

// ── Item management ──────────────────────────────────────────
function addItem() {
    const container = document.getElementById('itemsContainer');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <div class="form-group">
            <input type="text" class="item-desc" placeholder="Item/service description" required>
        </div>
        <div class="form-group">
            <input type="number" class="item-qty" value="1" min="1" step="1">
        </div>
        <div class="form-group">
            <input type="number" class="item-price" value="0" min="0" step="${currencyStep()}">
        </div>
        <div class="form-group">
            <input type="number" class="item-total" value="0" readonly>
        </div>
        <button class="remove-btn" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(row);
    attachItemListeners(row);
}

function removeItem(btn) {
    btn.closest('.item-row').remove();
    calculateTotals();
}

function attachItemListeners(row) {
    const qty   = row.querySelector('.item-qty');
    const price = row.querySelector('.item-price');
    const total = row.querySelector('.item-total');

    function updateRowTotal() {
        total.value = (parseFloat(qty.value) * parseFloat(price.value) || 0).toFixed(2);
        calculateTotals();
    }

    qty.addEventListener('input', updateRowTotal);
    price.addEventListener('input', updateRowTotal);
}

function calculateTotals() {
    let grand = 0;
    document.querySelectorAll('.item-total').forEach(t => {
        grand += parseFloat(t.value) || 0;
    });
    document.getElementById('grandTotal').textContent = formatAmount(grand);
}

// ── PDF Generation ───────────────────────────────────────────
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Gather form values
    const docNumber      = document.getElementById('docNumber').value       || 'N/A';
    const docDate        = document.getElementById('docDate').value         || new Date().toISOString().split('T')[0];
    const customerName   = document.getElementById('customerName').value    || 'Customer';
    const customerPhone  = document.getElementById('customerPhone').value   || '';
    const customerAddress= document.getElementById('customerAddress').value || '';
    const dueDate        = document.getElementById('dueDate').value;

    // Grand total
    let grandTotalNum = 0;
    document.querySelectorAll('.item-total').forEach(t => {
        grandTotalNum += parseFloat(t.value) || 0;
    });
    const balanceDueText = formatAmount(grandTotalNum);

    // ── Header ──────────────────────────────────────────────
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 15, 10, 40, 25);
    }

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 119, 190);
    doc.text("DE'KODAO AGENCIES", 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Travel Beyond Expectations', 105, 26, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('KRA PIN: P051328559Q',                         105, 32, { align: 'center' });
    doc.text('Tel: +254 24145888, +254 112739045',           105, 37, { align: 'center' });
    doc.text('Email: info@dekodao.co.ke',                    105, 42, { align: 'center' });
    doc.text('P.O. Box 51528-0200 NAIROBI',                  105, 47, { align: 'center' });

    // ── Document title ───────────────────────────────────────
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 119, 190);
    doc.text(docType.toUpperCase(), 105, 60, { align: 'center' });

    // ── Document details box ─────────────────────────────────
    const boxHeight = (docType === 'invoice') ? 32 : 25;
    doc.setDrawColor(0, 119, 190);
    doc.setLineWidth(0.5);
    doc.rect(15, 68, 180, boxHeight);

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${docType === 'receipt' ? 'Receipt' : 'Invoice'} #:`, 20, 75);
    doc.text('Date:', 20, 82);
    if (docType === 'invoice' && dueDate) doc.text('Due Date:', 20, 89);

    doc.setFont(undefined, 'normal');
    doc.text(docNumber, 55, 75);
    doc.text(docDate,   55, 82);
    if (docType === 'invoice' && dueDate) doc.text(dueDate, 55, 89);

    // Bill To
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', 120, 75);
    doc.setFont(undefined, 'normal');
    doc.text(customerName, 120, 82);
    if (customerPhone) doc.text(customerPhone, 120, 87);

    // Balance due (invoices only)
    if (docType === 'invoice') {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 119, 190);
        doc.text('Balance Due:', 120, 94);
        doc.setFontSize(12);
        doc.text(balanceDueText, 120, 99);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
    }

    // ── Items table ──────────────────────────────────────────
    let yPos = (docType === 'invoice') ? 112 : 105;

    // Header row
    doc.setFillColor(0, 119, 190);
    doc.rect(15, yPos - 7, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Description',                           20, yPos - 2);
    doc.text('Qty',                                  130, yPos - 2);
    doc.text(`Price (${currencyLabel()})`,           145, yPos - 2);
    doc.text(`Total (${currencyLabel()})`,           173, yPos - 2);

    // Item rows
    yPos += 5;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    document.querySelectorAll('.item-row').forEach((item, index) => {
        const desc  = item.querySelector('.item-desc').value  || 'Item';
        const qty   = item.querySelector('.item-qty').value;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        const total = parseFloat(item.querySelector('.item-total').value) || 0;

        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(15, yPos - 5, 180, 7, 'F');
        }

        doc.text(desc.substring(0, 50),       20, yPos);
        doc.text(String(qty),                130, yPos);
        doc.text(formatAmount(price),        145, yPos);
        doc.text(formatAmount(total),        173, yPos);
        yPos += 7;
    });

    // ── Totals ───────────────────────────────────────────────
    yPos += 5;
    doc.setDrawColor(0, 119, 190);
    doc.setLineWidth(0.5);
    doc.line(120, yPos, 195, yPos);
    yPos += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 119, 190);
    doc.text('TOTAL:',         130,           yPos + 3);
    doc.text(balanceDueText,   195,           yPos + 3, { align: 'right' });

    // ── Footer ───────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });

    // ── Save ─────────────────────────────────────────────────
    const filename = `${docType}-${docNumber}-${docDate}.pdf`;
    doc.save(filename);
}