import { useEffect } from 'react';
import QRCode from 'qrcode';
import type { Bank } from '../types/bank';

const BACKEND_URL = 'http://localhost:4000/api';

interface QRCodeGeneratorProps {
  bank: Bank;
  onGenerate: (dataUrl: string) => void;
}

export const generateQRCodeData = (bank: Bank) => {
  // Create a URL with the bank data as query parameters
  const params = new URLSearchParams({
    bankId: bank.id.toString(),
    bankName: bank.bankName,
    branchName: bank.branchName,
    ifscCode: bank.ifscCode,
    ufi: bank.ufi.toString(),
    address: bank.address,
    timestamp: new Date().toISOString()
  });

  return `${BACKEND_URL}/bank-update?${params.toString()}`;
};

export const QRCodeGenerator = ({ bank, onGenerate }: QRCodeGeneratorProps) => {
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrData = generateQRCodeData(bank);
        console.log(qrData)
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        onGenerate(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
  }, [bank, onGenerate]);

  return null;
}; 