import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Bank } from '../types/bank';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 10,
  },
  date: {
    marginBottom: 15,
    textAlign: 'right',
  },
  addressee: {
    marginBottom: 10,
  },
  content: {
    lineHeight: 1.4,
    textAlign: 'justify',
  },
  address: {
    marginLeft: 15,
    marginVertical: 5,
  },
  footer: {
    marginTop: 20,
    borderTop: '1px solid black',
    paddingTop: 10,
  },
  qrCode: {
    width: 80,
    height: 80,
    marginVertical: 10,
    alignSelf: 'center',
  },
  paragraph: {
    marginBottom: 5,
  }
});

interface BankLetterPDFProps {
  bank: Bank;
  qrCodeUrl: string;
  date?: string;
}

export const BankLetterPDF = ({ bank, qrCodeUrl, date = '17th June 2025' }: BankLetterPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.date}>Dated: {date}</Text>
        <View style={styles.addressee}>
          <Text>To</Text>
          <Text>The Branch Manager</Text>
          <Text>{bank.bankName}</Text>
        </View>
        <Text>Dear Sir/Madam,</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.paragraph}>
          We work for Google and are currently in the process of updating bank branch addresses on Google Map. During this process, we noticed that the address listed for your branch, according to the RBI records, appears to be inaccurate or incomplete.
        </Text>

        <Text style={styles.paragraph}>As per the RBI records, the address is listed as:</Text>

        <View style={styles.address}>
          <Text>{bank.bankName},</Text>
          <Text>{bank.address}</Text>
        </View>

        <Text style={styles.paragraph}>
          To ensure the accuracy of our records and to help users easily locate your branch, we kindly request you to share the correct and complete branch address, along with the accurate IFSC code.
        </Text>

        <Text style={styles.paragraph}>Please scan the QR code below and share your details, so we can update our database accordingly.</Text>

        <Image src={qrCodeUrl} style={styles.qrCode} />

        <Text style={styles.paragraph}>
          This effort is aimed at ensuring that the public has access to accurate information, allowing them to access banking facilities smoothly and without confusion.
        </Text>

        <Text style={styles.paragraph}>Thank you for your cooperation.</Text>
      </View>

      <View style={styles.footer}>
        <Text>From:</Text>
        <Text>Lepton Software Export and Research (P) Ltd.</Text>
        <Text>570, Udyog Vihar, Phase-V</Text>
        <Text>Gurugram, Haryana – 122016</Text>
        <Text>http://www.leptonsoftware.com</Text>
      </View>
    </Page>
  </Document>
); 