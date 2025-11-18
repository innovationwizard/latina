import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getQuotationVersion } from '@/lib/quotation-engine';

/**
 * GET /api/quotes/[id]/export/pdf
 * Generate PDF export of quotation
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('version_id');

    // Get quotation
    const quoteResult = await query(
      `SELECT q.*, p.project_name, p.client_name
       FROM quotes q
       JOIN projects p ON q.project_id = p.id
       WHERE q.id = $1`,
      [params.id]
    );

    if (quoteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const quote = quoteResult.rows[0];
    const targetVersionId = versionId || quote.current_version_id;

    if (!targetVersionId) {
      return NextResponse.json({ error: 'No version available' }, { status: 404 });
    }

    const version = await getQuotationVersion(targetVersionId);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Group items by space
    const grouped: Record<string, typeof version.items> = {};
    const ungrouped: typeof version.items = [];

    version.items.forEach((item: any) => {
      if (item.space_id) {
        const spaceId = item.space_id;
        const spaceName = item.space_name || 'Sin espacio';
        if (!grouped[spaceId]) {
          grouped[spaceId] = [];
        }
        grouped[spaceId].push({ ...item, space_name: spaceName });
      } else {
        ungrouped.push(item);
      }
    });

    // Generate PDF HTML
    const html = generatePDFHTML(quote, version, grouped, ungrouped);

    return NextResponse.json({ html }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}

function generatePDFHTML(
  quote: any,
  version: any,
  grouped: Record<string, any[]>,
  ungrouped: any[]
): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          color: #171717;
          margin: 0;
          padding: 40px;
          background: white;
        }
        .header {
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e5e5;
        }
        .header h1 {
          font-size: 24px;
          font-weight: 300;
          margin: 0 0 8px 0;
          color: #171717;
        }
        .header p {
          font-size: 11px;
          color: #666;
          margin: 4px 0;
        }
        .space-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .space-title {
          font-size: 16px;
          font-weight: 300;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e5e5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f9f9f9;
          padding: 10px 8px;
          text-align: left;
          font-weight: 500;
          font-size: 10px;
          text-transform: uppercase;
          color: #666;
          border-bottom: 1px solid #e5e5e5;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 11px;
        }
        .text-right {
          text-align: right;
        }
        .subtotal-row {
          background: #f9f9f9;
          font-weight: 500;
        }
        .totals {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e5e5;
        }
        .totals table {
          width: 300px;
          margin-left: auto;
        }
        .totals .total-row {
          font-size: 14px;
          font-weight: 500;
          border-top: 1px solid #e5e5e5;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cotización</h1>
        <p><strong>Proyecto:</strong> ${quote.project_name}</p>
        <p><strong>Cliente:</strong> ${quote.client_name}</p>
        <p><strong>Versión:</strong> ${version.version_number} ${version.is_final ? '(Final)' : '(Borrador)'}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
      </div>
  `;

  // Add grouped items by space
  Object.entries(grouped).forEach(([spaceId, items]) => {
    html += `
      <div class="space-section">
        <h2 class="space-title">${items[0].space_name}</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Cantidad</th>
              <th class="text-right">Costo Unit.</th>
              <th class="text-right">Mano de Obra</th>
              <th class="text-right">Subtotal</th>
              <th class="text-right">Precio con IVA</th>
              <th class="text-right">Utilidad</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((item) => {
      html += `
        <tr>
          <td>
            <strong>${item.item_name}</strong>
            ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
            ${item.materials && Array.isArray(item.materials) && item.materials.length > 0
              ? `<br><small style="color: #666;">Materiales: ${item.materials.join(', ')}</small>`
              : ''}
          </td>
          <td>${item.quantity} ${item.unit_symbol || 'u'}</td>
          <td class="text-right">${formatCurrency(item.unit_cost)}</td>
          <td class="text-right">${formatCurrency(item.labor_cost)}</td>
          <td class="text-right"><strong>${formatCurrency(item.subtotal)}</strong></td>
          <td class="text-right"><strong>${formatCurrency(item.price_with_iva)}</strong></td>
          <td class="text-right">${formatCurrency(item.profit)}</td>
        </tr>
      `;
    });

    const spaceSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const spaceTotal = items.reduce((sum, item) => sum + item.price_with_iva, 0);
    const spaceProfit = items.reduce((sum, item) => sum + item.profit, 0);

    html += `
            <tr class="subtotal-row">
              <td colspan="4" class="text-right"><strong>Subtotal ${items[0].space_name}:</strong></td>
              <td class="text-right"><strong>${formatCurrency(spaceSubtotal)}</strong></td>
              <td class="text-right"><strong>${formatCurrency(spaceTotal)}</strong></td>
              <td class="text-right"><strong>${formatCurrency(spaceProfit)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  // Add ungrouped items
  if (ungrouped.length > 0) {
    html += `
      <div class="space-section">
        <h2 class="space-title">Otros Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Cantidad</th>
              <th class="text-right">Costo Unit.</th>
              <th class="text-right">Mano de Obra</th>
              <th class="text-right">Subtotal</th>
              <th class="text-right">Precio con IVA</th>
              <th class="text-right">Utilidad</th>
            </tr>
          </thead>
          <tbody>
    `;

    ungrouped.forEach((item) => {
      html += `
        <tr>
          <td><strong>${item.item_name}</strong></td>
          <td>${item.quantity} ${item.unit_symbol || 'u'}</td>
          <td class="text-right">${formatCurrency(item.unit_cost)}</td>
          <td class="text-right">${formatCurrency(item.labor_cost)}</td>
          <td class="text-right"><strong>${formatCurrency(item.subtotal)}</strong></td>
          <td class="text-right"><strong>${formatCurrency(item.price_with_iva)}</strong></td>
          <td class="text-right">${formatCurrency(item.profit)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Add totals
  html += `
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right"><strong>${formatCurrency(version.totals.total_cost)}</strong></td>
          </tr>
          <tr>
            <td>IVA (${(quote.iva_rate * 100).toFixed(0)}%):</td>
            <td class="text-right"><strong>${formatCurrency(version.totals.total_with_iva - version.totals.total_cost)}</strong></td>
          </tr>
          <tr class="total-row">
            <td><strong>Total:</strong></td>
            <td class="text-right"><strong>${formatCurrency(version.totals.total_with_iva)}</strong></td>
          </tr>
          <tr>
            <td>Utilidad Estimada:</td>
            <td class="text-right">${formatCurrency(version.totals.total_profit)}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  return html;
}

