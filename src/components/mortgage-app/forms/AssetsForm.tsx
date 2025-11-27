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
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    type: 'checking',
  });

  const addOrUpdateAsset = () => {
    if (!newAsset.financialInstitution || !newAsset.balance) {
      toast({
        title: 'Required fields missing',
        description: 'Please enter institution and balance',
        variant: 'destructive',
      });
      return;
    }

    if (editingAssetId) {
      // Update existing
      const updated = data.assets.assets.map((asset) =>
        asset.id === editingAssetId ? { ...asset, ...newAsset } : asset
      );
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'assets', data: { ...data.assets, assets: updated } },
      });
      toast({ title: 'Asset updated' });
    } else {
      // Add new
      const asset: Asset = {
        id: Date.now().toString(),
        type: newAsset.type || 'checking',
        financialInstitution: newAsset.financialInstitution,
        accountNumber: newAsset.accountNumber || '',
        balance: newAsset.balance,
      };
      dispatch({
        type: 'UPDATE_SECTION',
        payload: { section: 'assets', data: { ...data.assets, assets: [...data.assets.assets, asset] } },
      });
      toast({ title: 'Asset added' });
    }

    setNewAsset({ type: 'checking' });
    setEditingAssetId(null);
    setShowDialog(false);
  };

  const openAssetDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAssetId(asset.id);
      setNewAsset(asset);
    } else {
      setEditingAssetId(null);
      setNewAsset({ type: 'checking' });
    }
    setShowDialog(true);
  };

  const removeAsset = (id: string) => {
    const updated = data.assets.assets.filter((a) => a.id !== id);
    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'assets', data: { ...data.assets, assets: updated } },
    });
  };

  const handleContinue = () => {
    // Calculate total assets
    const totalAssets = data.assets.assets.reduce((sum, asset) => {
      const balance = parseFloat(asset.balance.replace(/,/g, '')) || 0;
      return sum + balance;
    }, 0);

    // Get down payment amount
    const downPaymentStr = data.mortgageInfo.downPaymentAmount.replace(/,/g, '');
    const downPayment = parseFloat(downPaymentStr) || 0;

    // Validate assets cover down payment
    if (totalAssets < downPayment) {
      const shortfall = downPayment - totalAssets;
      toast({
        title: 'Insufficient Assets',
        description: `Your total assets ($${totalAssets.toLocaleString()}) must cover the down payment ($${downPayment.toLocaleString()}). You need $${shortfall.toLocaleString()} more in assets.`,
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Assets</h2>
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
              {data.assets.assets.map((asset) => {
                const formatBalance = (balance: string) => {
                  const num = parseFloat(balance.replace(/,/g, ''));
                  return isNaN(num) ? balance : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                };
                
                const getAssetTypeLabel = (type: string) => {
                  const labels: Record<string, string> = {
                    'checking': 'Checking Account',
                    'savings': 'Savings Account',
                    'investment': 'Investment Account',
                    'retirement': 'Retirement Account (401k, IRA)',
                    'gift': 'Gift',
                    'other': 'Other'
                  };
                  return labels[type] || type;
                };
                
                return (
                  <Card key={asset.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openAssetDialog(asset)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Asset Type</p>
                          <p className="font-medium">{getAssetTypeLabel(asset.type)}</p>
                          
                          <p className="text-xs text-muted-foreground mt-2">Financial Institution</p>
                          <p className="text-sm">{asset.financialInstitution}</p>
                          
                          {asset.accountNumber && (
                            <>
                              <p className="text-xs text-muted-foreground mt-2">Account #</p>
                              <p className="text-sm">***{asset.accountNumber}</p>
                            </>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">Cash/Market Value</p>
                          <p className="text-sm font-semibold">${formatBalance(asset.balance)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAsset(asset.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => openAssetDialog()}
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
        <Button onClick={handleContinue}>
          Save & Continue
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssetId ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
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
                  <SelectItem value="gift">Gift</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Financial Institution *</Label>
                <Input
                  value={newAsset.financialInstitution}
                  onChange={(e) => setNewAsset({ ...newAsset, financialInstitution: e.target.value })}
                  placeholder="Bank name"
                />
              </div>

              <div className="space-y-2">
                <Label>Account # (Last 4) *</Label>
                <Input
                  value={newAsset.accountNumber}
                  onChange={(e) => setNewAsset({ ...newAsset, accountNumber: e.target.value })}
                  placeholder="Last 4 digits"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cash or Market Value *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  value={newAsset.balance}
                  onChange={(e) => setNewAsset({ ...newAsset, balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addOrUpdateAsset}>
                {editingAssetId ? 'Update' : 'Add'} Asset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
