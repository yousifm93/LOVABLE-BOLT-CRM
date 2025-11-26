import React from 'react';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, FileText } from 'lucide-react';

interface DeclarationsFormProps {
  onNext: () => void;
  onBack: () => void;
}

const declarations = [
  {
    id: 'declared-bankruptcy',
    question: 'Have you declared bankruptcy within the past 7 years?',
  },
  {
    id: 'property-foreclosed',
    question: 'Have you had property foreclosed upon in the last 7 years?',
  },
  {
    id: 'delinquent-debt',
    question: 'Are you presently delinquent or in default on any Federal debt?',
  },
  {
    id: 'alimony-obligations',
    question: 'Are you obligated to pay alimony, child support, or separate maintenance?',
  },
  {
    id: 'down-payment-borrowed',
    question: 'Is any part of the down payment borrowed?',
  },
  {
    id: 'ownership-interest',
    question: 'Have you had an ownership interest in another property in the last three years?',
  },
];

export const DeclarationsForm: React.FC<DeclarationsFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const handleAnswerChange = (id: string, value: string) => {
    const answer = value === 'yes';
    const updatedDeclarations = data.declarations.map((dec) =>
      dec.id === id ? { ...dec, answer } : dec
    );

    dispatch({
      type: 'UPDATE_SECTION',
      payload: { section: 'declarations', data: updatedDeclarations },
    });
  };

  const getAnswer = (id: string): string => {
    const declaration = data.declarations.find((dec) => dec.id === id);
    if (declaration?.answer === null) return '';
    return declaration?.answer ? 'yes' : 'no';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Declarations</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Required Declarations
          </CardTitle>
          <CardDescription>Please answer all questions honestly and completely</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {declarations.map((declaration, index) => (
            <div key={declaration.id} className="space-y-3 pb-4 border-b last:border-0">
              <Label className="text-base font-normal">
                {index + 1}. {declaration.question}
              </Label>
              <RadioGroup
                value={getAnswer(declaration.id)}
                onValueChange={(value) => handleAnswerChange(declaration.id, value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${declaration.id}-yes`} />
                  <Label htmlFor={`${declaration.id}-yes`} className="font-normal cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${declaration.id}-no`} />
                  <Label htmlFor={`${declaration.id}-no`} className="font-normal cursor-pointer">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ))}
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
    </div>
  );
};
