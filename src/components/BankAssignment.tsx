import { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { BankLetterPDF } from './BankLetterPDF';
import { QRCodeGenerator, generateQRCodeData } from './QRCodeGenerator';
import QRCode from 'qrcode';
import type { Bank } from '../types/bank';

const formSchema = z.object({
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^[0-9]+$/, "Phone number must contain only digits")
    .refine((val) => !val.startsWith('0'), "Phone number should not start with 0"),
  
  phoneResponse: z.enum([
    'toll_free',
    'registered_only',
    'invalid_number',
    'no_response',
    'switched_off',
    'number_not_found'
  ], {
    required_error: "Please select a phone response type"
  }),

  response: z.enum([
    'address_change',
    'branch_name_change',
    'no_change_in_address',
    'bank_shift'
  ]).optional(),
  
  updateAddress: z.string()
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address must not exceed 200 characters")
    .regex(/^[a-zA-Z0-9\s,.-]+$/, "Address can only contain letters, numbers, spaces, commas, dots, and hyphens")
    .optional()
    .refine((val) => {
      if (!val) return true;
      return val.trim().split(' ').length >= 3;
    }, "Address should contain at least 3 words"),
  
  updatedBranchName: z.string()
    .min(3, "Branch name must be at least 3 characters")
    .max(100, "Branch name must not exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Branch name can only contain letters, numbers, spaces, and hyphens")
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[A-Z]/.test(val);
    }, "Branch name should start with a capital letter"),
  
  remarks: z.string()
    .max(500, "Remarks must not exceed 500 characters")
    .optional()
    .transform(val => val || "")
});

const SHEETY_API = 'https://api.sheety.co/632604ca09353483222880568eb0ebe2/bankAddressForCalling/banks';

export function BankAssignment() {
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [currentBank, setCurrentBank] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [allBanks, setAllBanks] = useState<Bank[]>([]);
  const [generatingPDFs, setGeneratingPDFs] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: '',
      remarks: '',
    },
    mode: "onChange"
  });

  const fetchUnassignedBank = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(SHEETY_API);
      
      const banks = response.data.banks as Bank[];
      const unassignedBanks = banks.filter(bank => !bank.userName);
      
      if (unassignedBanks.length > 0) {
        const randomIndex = Math.floor(Math.random() * unassignedBanks.length);
        const randomBank = unassignedBanks[randomIndex];
        
         await axios.put(`${SHEETY_API}/${randomBank.id}`, {
          bank: { ...randomBank, userName },
        });
        setCurrentBank(randomBank);
      } else {
        setError("No unassigned banks available at the moment.");
      }
    } catch (error) {
      setError("Failed to fetch bank details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBanks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(SHEETY_API);
      setAllBanks(response.data.banks);
    } catch (error) {
      setError("Failed to fetch all banks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodeForBank = async (bank: Bank): Promise<string> => {
    try {
      const qrData = generateQRCodeData(bank);
      return await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
      return '';
    }
  };

  const handleGenerateAllPDFs = async () => {
    setGeneratingPDFs(true);
    try {
      for (const bank of allBanks) {
        const qrCodeUrl = await generateQRCodeForBank(bank);
        if (qrCodeUrl) {
          const doc = <BankLetterPDF bank={bank} qrCodeUrl={qrCodeUrl} />;
          const blob = await pdf(doc).toBlob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${bank.bankName.replace(/\s+/g, '_')}_${bank.branchName.replace(/\s+/g, '_')}_letter.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      setError("Failed to generate PDFs. Please try again.");
    } finally {
      setGeneratingPDFs(false);
    }
  };

  useEffect(() => {
    fetchAllBanks();
  }, []);

  useEffect(() => {
    if (userName && !currentBank && !loading) {
      fetchUnassignedBank();
    }
  }, [userName, currentBank, loading]);

  const handleNameSubmit = (name: string) => {
    if (name.trim()) {
      localStorage.setItem('userName', name.trim());
      setUserName(name.trim());
    }
  };

  const handleCancel = async () => {
    if (currentBank) {
      try {
        setLoading(true);
        setError(null);
        
        await axios.put(`${SHEETY_API}/${currentBank.id}`, {
          bank: {
            ...currentBank,
            userName: "",
            phoneNumber: "",
            response: "",
            updateAddress: "",
            updatedBranchName: "",
            remarks: ""
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCurrentBank(null);
        form.reset();
        
        await fetchUnassignedBank();
      } catch (error) {
        setError("Failed to cancel assignment. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentBank) return;

    try {
      setLoading(true);
      setError(null);
      
      // Check if response type is required
      const successfulResponses = ['toll_free', 'registered_only'];
      if (successfulResponses.includes(values.phoneResponse) && !values.response) {
        setError("Response type is required for successful calls");
        return;
      }

      // Validate required fields based on response type
      if (values.response === 'address_change' && !values.updateAddress) {
        setError("Updated address is required for address change");
        return;
      }
      if (values.response === 'branch_name_change' && !values.updatedBranchName) {
        setError("Updated branch name is required for branch name change");
        return;
      }
      if (values.response === 'bank_shift' && !values.updateAddress) {
        setError("Updated address is required for bank shift");
        return;
      }

      await axios.put(`${SHEETY_API}/${currentBank.id}`, {
        bank: {
          ...currentBank,
          ...values,
        },
      });
      
      setCurrentBank(null);
      form.reset();
      fetchUnassignedBank();
    } catch (error) {
      setError("Failed to update bank information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = () => {
    const newName = window.prompt("Enter new name:");
    if (newName?.trim()) {
      localStorage.setItem('userName', newName.trim());
      setUserName(newName.trim());
    }
  };

  if (!userName) {
    return (
      <Card className="w-[400px] mx-auto mt-8">
        <CardHeader>
          <CardTitle>Enter Your Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const nameInput = e.currentTarget.querySelector('input');
              if (nameInput?.value) {
                handleNameSubmit(nameInput.value);
              }
            }}>
              <FormField
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your name" 
                        {...field} 
                        autoFocus
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-4">Start Working</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  if (!currentBank) {
    return (
      <Card className="w-[400px] mx-auto mt-8">
        <CardHeader>
          <CardTitle>
            {error ? 'Error' : 'Finding Next Bank...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <>
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => fetchUnassignedBank()} disabled={loading}>
                Try Again
              </Button>
            </>
          ) : (
            <p className="text-center mb-4">Please wait while we find the next available bank...</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[600px] mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Bank Details</span>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline"
              disabled={generatingPDFs}
              onClick={handleGenerateAllPDFs}
              className="min-w-[200px]"
            >
              {generatingPDFs ? 'Generating PDFs...' : 'Generate Individual PDFs for All Banks'}
            </Button>
            <span className="text-sm font-normal">Working as: {userName}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNameChange}
              className="text-xs"
            >
              Change Name
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex">
                <span className="w-24 font-semibold">UFI:</span>
                <span>{currentBank.ufi}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-semibold">Bank Name:</span>
                <span>{currentBank.bankName}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-semibold">Branch:</span>
                <span>{currentBank.branchName}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex">
                <span className="w-24 font-semibold">IFSC:</span>
                <span>{currentBank.ifscCode}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-semibold">Address:</span>
                <span className="flex-1">{currentBank.address}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-4">
            <QRCodeGenerator 
              bank={currentBank}
              onGenerate={setQrCodeUrl}
            />
            {qrCodeUrl && (
              <PDFDownloadLink
                document={
                  <BankLetterPDF 
                    bank={currentBank}
                    qrCodeUrl={qrCodeUrl}
                  />
                }
                fileName={`${currentBank.bankName.replace(/\s+/g, '_')}_letter.pdf`}
              >
                {({ loading }) => (
                  <Button 
                    variant="outline"
                    disabled={loading}
                    className="min-w-[150px]"
                  >
                    {loading ? 'Generating PDF...' : 'Generate Letter'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="font-medium">Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter phone number" 
                      {...field} 
                      autoFocus
                      className={`${fieldState.error ? "border-red-500" : ""} h-10`}
                    />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneResponse"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Phone Response</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={`bg-blue-50 border-blue-200 focus:ring-blue-500 hover:bg-blue-100 h-10 ${fieldState.error ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Select phone response" className="text-blue-900" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-blue-200">
                      <SelectItem value="toll_free" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Toll Free Number</SelectItem>
                      <SelectItem value="registered_only" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Can Contact Only Through Registered Number</SelectItem>
                      <SelectItem value="invalid_number" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Invalid Phone Number</SelectItem>
                      <SelectItem value="no_response" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">No Response</SelectItem>
                      <SelectItem value="switched_off" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Phone Number Switched Off</SelectItem>
                      <SelectItem value="number_not_found" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Number Not Found</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="response"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">
                    Response Type {form.watch('phoneResponse') === 'toll_free' || form.watch('phoneResponse') === 'registered_only' ? '(Required)' : '(Optional)'}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={`bg-blue-50 border-blue-200 focus:ring-blue-500 hover:bg-blue-100 h-10 ${fieldState.error ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Select response type" className="text-blue-900" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-blue-200">
                      <SelectItem value="address_change" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Address Change</SelectItem>
                      <SelectItem value="branch_name_change" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Branch Name Change</SelectItem>
                      <SelectItem value="no_change_in_address" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">No Change in Address</SelectItem>
                      <SelectItem value="bank_shift" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Bank Shift</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                  )}
                </FormItem>
              )}
            />

            {(form.watch('response') === 'address_change') && (
              <FormField
                control={form.control}
                name="updateAddress"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Correct Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter the correct address" 
                        {...field} 
                        className={`${fieldState.error ? "border-red-500" : ""} h-10`}
                      />
                    </FormControl>
                    {fieldState.error && (
                      <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                    )}
                  </FormItem>
                )}
              />
            )}

            {(form.watch('response') === 'bank_shift') && (
              <FormField
                control={form.control}
                name="updateAddress"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="font-medium">New Location Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter the new location address" 
                        {...field} 
                        className={`${fieldState.error ? "border-red-500" : ""} h-10`}
                      />
                    </FormControl>
                    {fieldState.error && (
                      <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                    )}
                  </FormItem>
                )}
              />
            )}

            {(form.watch('response') === 'branch_name_change') && (
              <FormField
                control={form.control}
                name="updatedBranchName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Updated Branch Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter updated branch name" 
                        {...field} 
                        className={`${fieldState.error ? "border-red-500" : ""} h-10`}
                      />
                    </FormControl>
                    {fieldState.error && (
                      <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                    )}
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="font-medium">Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any remarks or additional information" 
                      {...field} 
                      className={`${fieldState.error ? "border-red-500" : ""} min-h-[100px] resize-none`}
                    />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1.5">{fieldState.error.message}</p>
                  )}
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-4 pt-4 border-t">
              <Button type="submit" className="min-w-[200px]" disabled={loading}>
                Submit and Get Next
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="min-w-[200px]"
                onClick={handleCancel} 
                disabled={loading}
              >
                Cancel and Skip
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 