export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
  const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    return res.status(500).json({ error: 'Mux credentials not configured on server' });
  }

  try {
    const response = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)
      },
      body: JSON.stringify({
        playback_policy: ["public"],
        new_asset_settings: { playback_policy: ["public"] },
        reconnect_window: 60
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mux API error: ${response.status}`);
    }

    const data = await response.json();
    const stream = data.data;

    return res.status(200).json({
      playbackId: stream.playback_ids[0].id,
      rtmpUrl: stream.streams[0]?.url || 'rtmp://global-live.mux.com:5222/app',
      streamKey: stream.stream_key,
      status: stream.status
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}