const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

console.log('📦 Packages loaded successfully!');

// Check for Arabic font
const fontPath = path.join(__dirname, 'Amiri-Regular.ttf');
const hasArabicFont = fs.existsSync(fontPath);

if (hasArabicFont) {
    console.log('✅ Arabic font (Amiri-Regular.ttf) found!');
} else {
    console.log('⚠️ Arabic font not found. Arabic text will use default font.');
    console.log('   To add Arabic support: Download Amiri-Regular.ttf to this folder');
}

// Helper function to format dates
function formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    try {
        const date = new Date(dateValue);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'N/A';
    }
}

// ✅ ENDPOINT: Generate single request PDF
app.post('/generate-pdf', (req, res) => {
    try {
        console.log('📄 Generating PDF for single request...');
        const { request } = req.body;

        if (!request) {
            return res.status(400).json({ error: 'No request data provided' });
        }

        // Create PDF document
        const doc = new PDFDocument({ 
            size: 'A4',
            margin: 50,
            bufferPages: true
        });

        // Register Arabic font if available
        if (hasArabicFont) {
            doc.registerFont('Arabic', fontPath);
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Request_${request['Request Number'] || 'Unknown'}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Get page dimensions
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        const contentWidth = pageWidth - (2 * margin);

        // Helper function to write text with Arabic support
        function writeText(text, options = {}) {
            const font = hasArabicFont ? 'Arabic' : (options.bold ? 'Helvetica-Bold' : 'Helvetica');
            doc.font(font);
            return doc.text(text, options);
        }

        // === HEADER ===
        doc.rect(0, 0, pageWidth, 100).fill('#040476');
        doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
           .text('Request Details', 0, 30, { align: 'center' });
        doc.fontSize(12).font('Helvetica')
           .text(`Request #: ${request['Request Number'] || 'N/A'}`, 0, 60, { align: 'center' });

        let yPosition = 130;

        // === STATUS BADGE ===
        const status = request.Status || 'Waiting';
        const statusLower = status.toLowerCase();
        let statusColor = '#E64D4D';
        
        if (statusLower.includes('approved')) statusColor = '#FFB700';
        else if (statusLower.includes('processing')) statusColor = '#42794D';
        else if (statusLower.includes('completed')) statusColor = '#09034D';
        else if (statusLower.includes('rejected')) statusColor = '#969696';

        doc.roundedRect(margin, yPosition, 100, 25, 5).fill(statusColor);
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
           .text(status, margin + 10, yPosition + 8);

        yPosition += 40;

        // === BASIC INFORMATION ===
        doc.rect(margin, yPosition, contentWidth, 20).fill('#F0F4FF');
        doc.fillColor('#040476').fontSize(12).font('Helvetica-Bold')
           .text('Basic Information', margin + 5, yPosition + 6);

        yPosition += 30;

        // Fields
        const fields = [
            { label: 'Date Submitted:', value: formatDate(request['Request Date'] || request.Date) },
            { label: 'Submitted by:', value: request.Name || 'N/A' },
            { label: 'College:', value: request.College || 'N/A' },
            { label: 'Department:', value: request.Department || 'N/A' },
            { label: 'Location:', value: request.Location || 'N/A' },
            { label: 'Mobile:', value: request['Mobile Number'] || 'N/A' }
        ];

        fields.forEach(field => {
            doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold')
               .text(field.label, margin, yPosition);
            
            doc.fillColor('#000000').fontSize(10);
            if (hasArabicFont) {
                doc.font('Arabic');
            } else {
                doc.font('Helvetica');
            }
            doc.text(field.value, margin + 120, yPosition, { width: contentWidth - 120 });
            yPosition += 20;
        });

        yPosition += 10;

        // === DESCRIPTION ===
        doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold')
           .text('Issue Description:', margin, yPosition);
        yPosition += 15;

        doc.fillColor('#000000').fontSize(10);
        if (hasArabicFont) {
            doc.font('Arabic');
        } else {
            doc.font('Helvetica');
        }
        doc.text(request.Description || 'N/A', margin, yPosition, { width: contentWidth });

        const descHeight = doc.heightOfString(request.Description || 'N/A', { width: contentWidth });
        yPosition += descHeight + 20;

        // === FOOTER ===
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            doc.fillColor('#999999').fontSize(8).font('Helvetica')
               .text(`Page ${i + 1} of ${totalPages}`, 0, pageHeight - 30, { align: 'center' })
               .text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 30);
        }

        doc.end();
        console.log('✅ PDF generated successfully');

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ENDPOINT: Generate table PDF
app.post('/generate-table-pdf', (req, res) => {
    try {
        console.log('📄 Generating table PDF...');
        const { requests } = req.body;

        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
        
        // Register Arabic font if available
        if (hasArabicFont) {
            doc.registerFont('Arabic', fontPath);
        }
        
        const filename = `Requests_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;

        // Title
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#040476')
           .text('Maintenance Requests Report', margin, 30);
        doc.fontSize(10).font('Helvetica').fillColor('#666666')
           .text(`Generated: ${new Date().toLocaleString()}`, margin, 55);

        let yPosition = 85;

        // Table header
        const columns = [
            { label: 'Request #', width: 75 },
            { label: 'Status', width: 70 },
            { label: 'College', width: 120 },
            { label: 'Dept', width: 85 },
            { label: 'Location', width: 85 },
            { label: 'Description', width: 180 },
            { label: 'Date', width: 80 },
            { label: 'Amount', width: 70 }
        ];

        doc.rect(margin, yPosition, pageWidth - 2 * margin, 25).fill('#040476');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');

        let xPos = margin + 5;
        columns.forEach(col => {
            doc.text(col.label, xPos, yPosition + 8, { width: col.width - 10 });
            xPos += col.width;
        });

        yPosition += 25;

        // Table rows
        requests.forEach((request, index) => {
            if (yPosition > pageHeight - 100) {
                doc.addPage();
                yPosition = margin;
                
                // Redraw header on new page
                doc.rect(margin, yPosition, pageWidth - 2 * margin, 25).fill('#040476');
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
                xPos = margin + 5;
                columns.forEach(col => {
                    doc.text(col.label, xPos, yPosition + 8, { width: col.width - 10 });
                    xPos += col.width;
                });
                yPosition += 25;
            }

            const rowColor = index % 2 === 0 ? '#FFFFFF' : '#F5F7FA';
            doc.rect(margin, yPosition, pageWidth - 2 * margin, 20).fill(rowColor);

            doc.fontSize(8).fillColor('#000000');
            xPos = margin + 5;

            const rowData = [
                request['Request Number'] || 'N/A',
                request.Status || 'Waiting',
                (request.College || 'N/A').substring(0, 25),
                (request.Department || 'N/A').substring(0, 15),
                (request.Location || 'N/A').substring(0, 15),
                (request.Description || 'N/A').substring(0, 45) + '...',
                formatDate(request['Request Date']),
                request.Amount || '-'
            ];

            rowData.forEach((data, i) => {
                // Use Arabic font for text columns if available
                if (hasArabicFont && i >= 2 && i <= 5) {
                    doc.font('Arabic');
                } else {
                    doc.font('Helvetica');
                }
                doc.text(data, xPos, yPosition + 6, { width: columns[i].width - 10, lineBreak: false });
                xPos += columns[i].width;
            });

            yPosition += 20;
        });

        // Footer
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            doc.fillColor('#999999').fontSize(8).font('Helvetica')
               .text(`Page ${i + 1} of ${totalPages}`, 0, pageHeight - 25, { align: 'center' });
        }

        doc.end();
        console.log('✅ Table PDF generated');

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running!',
        arabicFont: hasArabicFont ? 'Available' : 'Not available'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('   PDF SERVER IS RUNNING!');
    console.log('================================');
    console.log(`📝 URL: http://localhost:${PORT}`);
    console.log(`🔤 Arabic Font: ${hasArabicFont ? 'Enabled ✅' : 'Disabled (using default font)'}`);
    console.log('✅ Ready to generate PDFs\n');
});