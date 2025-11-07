import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.LEONARDO_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 500 });
  }

  try {
    const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/me', {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'API key invalid',
        status: response.status,
        details: data 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      user: data.user_details?.[0]?.user?.username || 'found'
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
