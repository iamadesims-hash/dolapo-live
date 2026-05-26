import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signatureHeader = req.headers['mux-signature'];
  const rawBody = JSON.stringify(req.body); // Must use raw body

  const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

  if (!MUX_WEBHOOK_SECRET) {
    console.warn('Warning: Mux webhook secret not set');
  } else if (signatureHeader) {
    // Verify signature
    const [tPart, v1Part] = signatureHeader.split(',');
    const timestamp = tPart.replace('t=', '');
    const receivedSignature = v1Part.replace('v1=', '');

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', MUX_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    if (expectedSignature !== receivedSignature) {
      console.error('Invalid Mux signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const event = req.body;
  console.log(`✅ Verified Mux Webhook: ${event.type}`);

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.YOUR_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.channel('live-status').send({
      type: 'broadcast',
      event: 'stream_status',
      payload: {
        type: event.type,
        playback_id: event.data?.playback_id,
        timestamp: new Date().toISOString()
      }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
