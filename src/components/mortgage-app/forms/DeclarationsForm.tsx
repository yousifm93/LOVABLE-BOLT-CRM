import React from 'react';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeclarationsFormProps {
  onNext: () => void;
  onBack: () => void;
  isReadOnly?: boolean;
}

const declarations = [
  {
    id: 'primary-residence',
    question: 'Will you occupy the property as your primary residence?',
  },
  {
    id: 'ownership-interest',
    question: 'Have you had an ownership interest in another property in the last three years?',
  },
  {
    id: 'seller-affiliation',
    question: 'Do you have a family/business affiliation with the seller?',
  },
  {
    id: 'borrowing-undisclosed',
    question: 'Are you borrowing any money for this transaction not disclosed elsewhere?',
  },
];

export const DeclarationsForm: React.FC<DeclarationsFormProps> = ({ onNext, onBack, isReadOnly = false }) => {
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

  const updateDemographics = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'demographics',
        data: { ...data.demographics, [field]: value },
      },
    });
  };

  const updateEthnicity = (value: string) => {
    updateDemographics('ethnicity', value);
  };

  const updateRaceField = (field: string, value: boolean) => {
    updateDemographics('race', {
      ...data.demographics.race,
      [field]: value,
    });
  };

  return (
    <div className={cn("space-y-6", isReadOnly && "opacity-60 pointer-events-none")}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Declarations</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Required Declarations
          </CardTitle>
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

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            The purpose of collecting this information is to help ensure that all applicants are treated fairly and that
            the housing needs of communities and neighborhoods are being fulfilled. Federal law requires us to ask you to
            provide this information, but you are not required to furnish it. You will not be discriminated against if
            you choose not to provide this information.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Ethnicity
            </CardTitle>
            <CardDescription>Optional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.ethnicity === 'hispanic'}
                onCheckedChange={() => updateEthnicity('hispanic')}
              />
              <Label className="font-normal cursor-pointer">Hispanic or Latino</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.ethnicity === 'notHispanic'}
                onCheckedChange={() => updateEthnicity('notHispanic')}
              />
              <Label className="font-normal cursor-pointer">Not Hispanic or Latino</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.ethnicity === 'doNotWish'}
                onCheckedChange={() => updateEthnicity('doNotWish')}
              />
              <Label className="font-normal cursor-pointer">I do not wish to provide</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Race</CardTitle>
            <CardDescription>Optional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.race.americanIndianAlaskaNative}
                onCheckedChange={(checked) => updateRaceField('americanIndianAlaskaNative', !!checked)}
              />
              <Label className="font-normal cursor-pointer text-xs">American Indian or Alaska Native</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.race.asian}
                onCheckedChange={(checked) => updateRaceField('asian', !!checked)}
              />
              <Label className="font-normal cursor-pointer">Asian</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.race.blackAfricanAmerican}
                onCheckedChange={(checked) => updateRaceField('blackAfricanAmerican', !!checked)}
              />
              <Label className="font-normal cursor-pointer text-xs">Black or African American</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.race.nativeHawaiianPacificIslander}
                onCheckedChange={(checked) => updateRaceField('nativeHawaiianPacificIslander', !!checked)}
              />
              <Label className="font-normal cursor-pointer text-xs">Native Hawaiian / Pacific Islander</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.race.white}
                onCheckedChange={(checked) => updateRaceField('white', !!checked)}
              />
              <Label className="font-normal cursor-pointer">White</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={data.demographics.race.doNotWishToProvide}
                onCheckedChange={(checked) => updateRaceField('doNotWishToProvide', !!checked)}
              />
              <Label className="font-normal cursor-pointer text-xs">I do not wish to provide</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gender</CardTitle>
            <CardDescription>Optional</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={data.demographics.gender || ''}
              onValueChange={(value) => updateDemographics('gender', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prefer-not-to-say" id="gender-prefer-not" />
                <Label htmlFor="gender-prefer-not" className="font-normal cursor-pointer text-xs">
                  I do not wish to provide
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {!isReadOnly && (
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext}>
            Save & Continue
          </Button>
        </div>
      )}
    </div>
  );
};
