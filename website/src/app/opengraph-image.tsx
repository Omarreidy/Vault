import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'VAULT — Your Financial Operating System';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08080C',
          backgroundImage:
            'radial-gradient(60% 55% at 50% 0%, rgba(201,169,110,0.18), transparent 70%)',
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: '0.45em',
            color: '#C9A96E',
            fontWeight: 700,
            display: 'flex',
          }}
        >
          VAULT
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 72,
            fontFamily: 'Georgia, serif',
            fontWeight: 400,
            color: '#E8E0D5',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 900,
            display: 'flex',
          }}
        >
          Wealth has a new operating system.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            color: '#B0A99F',
            display: 'flex',
          }}
        >
          Real accounts · A daily feed of moves · A score that measures momentum
        </div>
      </div>
    ),
    size,
  );
}
