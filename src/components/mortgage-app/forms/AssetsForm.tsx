import React, { useState } from 'react';
import { useApplication, Asset } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, X, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AssetsFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const AssetsForm: React.FC<AssetsFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();
  const [showDialog, setShowDialog] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    type: 'checking',
  });

  const addAsset = () => {
    if (!newAsset.financialInstitution || !newAsset.balance) {
      toast({
        title: 'Required fields missing',
        description: 'Please enter institution and balance',
        variant: 'destructive',
      });
      return;
    }

    const asset: Asset = {
      id: Date.now().toString(),
      type: newAsset.type || 'checking',
      financialInstitution: newAsset.financialInstitution,
      accountNumber: newAsset.accountNumber || '',
      balance: newAsset.balance,
    };

    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'assets',
        data: { ...data.assets, assets: [...data.assets.assets, asset] },
      },
    });

    setNewAsset({ type: 'checking' });
    setShowDialog(false);

    toast({
      title: 'Asset added',
      description: 'Your asset has been added',
    });
  };

  const removeAsset = (id: string) => {
    const updated = data.assets.assets.filter((a) => a.id !== id);
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'assets', data: { ...data.assets, assets: updated } },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Assets</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Your Assets
          </CardTitle>
          <CardDescription>Add all bank accounts, investments, and other assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.assets.assets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No assets added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.assets.assets.map((asset) => (
                <Card key={asset.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{asset.type}</p>
                        <p className="text-sm text-muted-foreground">{asset.financialInstitution}</p>
                        <p className="text-sm font-medium">${asset.balance}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAsset(asset.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Save & Continue
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Select
                value={newAsset.type}
                onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="investment">Investment Account</SelectItem>
                  <SelectItem value="retirement">Retirement Account (401k, IRA)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Financial Institution *</Label>
              <Input
                value={newAsset.financialInstitution}
                onChange={(e) => setNewAsset({ ...newAsset, financialInstitution: e.target.value })}
                placeholder="Bank name"
              />
            </div>

            <div className="space-y-2">
              <Label>Account Number (Last 4 digits)</Label>
              <Input
                value={newAsset.accountNumber}
                onChange={(e) => setNewAsset({ ...newAsset, accountNumber: e.target.value })}
                placeholder="XXXX"
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Current Balance *</Label>
              <Input
                value={newAsset.balance}
                onChange={(e) => setNewAsset({ ...newAsset, balance: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addAsset}>
                Add Asset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
