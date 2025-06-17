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
import type { Bank } from '../types/bank';

const formSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must not exceed 15 digits"),
  response: z.enum(['address_change', 'name_change', 'name_and_address_change'], {
    required_error: "Please select a response type"
  }),
  updateAddress: z.string().optional(),
  updatedBranchName: z.string().optional(),
  remarks: z.string().min(1, "Please enter remarks"),
});

const SHEETY_API = 'https://api.sheety.co/632604ca09353483222880568eb0ebe2/bankAddressForCalling/banks';

export function BankAssignment() {
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [currentBank, setCurrentBank] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: '',
      remarks: '',
    },
  });

  const fetchUnassignedBank = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(SHEETY_API);
      
      const banks = response.data.banks as Bank[];
      // Filter all unassigned banks
      const unassignedBanks = banks.filter(bank => !bank.userName);
      console.log("Total unassigned banks:", unassignedBanks.length);
      
      if (unassignedBanks.length > 0) {
        // Randomly select one bank from unassigned banks
        const randomIndex = Math.floor(Math.random() * unassignedBanks.length);
        const randomBank = unassignedBanks[randomIndex];
        console.log("Randomly selected bank:", randomBank.id);
        
        // First assign the user to this bank
        const res = await axios.put(`${SHEETY_API}/${randomBank.id}`, {
          bank: { ...randomBank, userName },
        });
        console.log("res", res);
        setCurrentBank(randomBank);
      } else {
        setError("No unassigned banks available at the moment.");
      }
    } catch (error) {
      console.error('Error fetching bank:', error);
      setError("Failed to fetch bank details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        
        // First update the bank to remove user assignment
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
        
        // Wait a bit to ensure Google Sheets has updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear current bank and form
        setCurrentBank(null);
        form.reset();
        
        // Explicitly fetch a new unassigned bank
        await fetchUnassignedBank();
      } catch (error) {
        console.error('Error canceling assignment:', error);
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
      
      // Validate required fields based on response type
      if (values.response === 'address_change' && !values.updateAddress) {
        setError("Updated address is required for address change");
        return;
      }
      if (values.response === 'name_change' && !values.updatedBranchName) {
        setError("Updated branch name is required for name change");
        return;
      }
      if (values.response === 'name_and_address_change' && (!values.updateAddress || !values.updatedBranchName)) {
        setError("Both updated address and branch name are required");
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
      // Automatically fetch next unassigned bank
      fetchUnassignedBank();
    } catch (error) {
      console.error('Error updating bank:', error);
      setError("Failed to update bank information. Please try again.");
    } finally {
      setLoading(false);
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
            <p className="text-center">Please wait while we find the next available bank...</p>
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
          <span className="text-sm font-normal">Working as: {userName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          <div>
            <strong>UFI:</strong> {currentBank.ufi}
          </div>
          <div>
            <strong>Bank Name:</strong> {currentBank.bankName}
          </div>
          <div>
            <strong>Branch:</strong> {currentBank.branchName}
          </div>
          <div>
            <strong>IFSC:</strong> {currentBank.ifscCode}
          </div>
          <div>
            <strong>Address:</strong> {currentBank.address}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter phone number" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="response"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-blue-50 border-blue-200 focus:ring-blue-500 hover:bg-blue-100">
                        <SelectValue placeholder="Select response type" className="text-blue-900" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-blue-200">
                      <SelectItem value="address_change" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Address Change</SelectItem>
                      <SelectItem value="name_change" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Branch Name Change</SelectItem>
                      <SelectItem value="name_and_address_change" className="hover:bg-blue-50 focus:bg-blue-50 cursor-pointer">Branch Name & Address Change</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {(form.watch('response') === 'address_change' || form.watch('response') === 'name_and_address_change') && (
              <FormField
                control={form.control}
                name="updateAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Updated Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter updated address" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {(form.watch('response') === 'name_change' || form.watch('response') === 'name_and_address_change') && (
              <FormField
                control={form.control}
                name="updatedBranchName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Updated Branch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter updated branch name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any remarks or additional information" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                Submit and Get Next
              </Button>
              <Button 
                type="button" 
                variant="outline" 
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