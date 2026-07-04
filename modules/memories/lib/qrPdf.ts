import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

// Build a printable PDF containing the memorial's QR code (linking to its public
// page) plus the person's name/subtitle, and trigger a download. Client-side.
export async function downloadQrPdf(url: string, name: string, subtitle?: string | null): Promise<void> {
  const qrDataUrl = await QRCode.toDataURL(url, { width: 800, margin: 1 })

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const center = pageW / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text(name, center, 40, { align: 'center' })

  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.setTextColor(90)
    doc.text(subtitle, center, 50, { align: 'center' })
    doc.setTextColor(0)
  }

  const qrSize = 95
  doc.addImage(qrDataUrl, 'PNG', center - qrSize / 2, 68, qrSize, qrSize)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text('Scan to visit the memorial page', center, 178, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(url, center, 185, { align: 'center' })

  const safe = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'memorial'
  doc.save(`memorial-${safe}.pdf`)
}
