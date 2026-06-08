export const config = {
  runtime: 'edge', // Use Edge runtime for maximum speed and caching
};

export default async function handler(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const tab = url.searchParams.get('tab');

  if (!id || !tab) {
    return new Response(JSON.stringify({ error: 'Missing id or tab' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

  try {
    const fetchRes = await fetch(sheetUrl);
    
    if (!fetchRes.ok) {
      return new Response(JSON.stringify({ error: `Google Sheets responded with ${fetchRes.status}` }), {
        status: fetchRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const csv = await fetchRes.text();

    // Check if it's an HTML page (meaning it's private and requires login)
    if (csv.trim().startsWith('<!DOCTYPE html>')) {
      return new Response(JSON.stringify({ error: 'Google Sheet is private.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the CSV with Edge Caching: cache for 60 seconds, serve stale up to 12 hours
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=43200',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
