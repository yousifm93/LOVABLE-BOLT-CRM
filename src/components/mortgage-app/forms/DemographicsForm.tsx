import React from 'react';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Users } from 'lucide-react';

interface DemographicsFormProps {
  onNext: () => void;
  onBack: () => void;
}

export const DemographicsForm: React.FC<DemographicsFormProps> = ({ onNext, onBack }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const updateDemographics = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_SECTION',
      payload: {
        section: 'demographics',
        data: { ...data.demographics, [field]: value },
      },
    });
  };

  const toggleEthnicity = (ethnicity: string) => {
    const current = data.demographics.ethnicity || [];
    const updated = current.includes(ethnicity)
      ? current.filter((e) => e !== ethnicity)
      : [...current, ethnicity];
    updateDemographics('ethnicity', updated);
  };

  const toggleRace = (race: string) => {
    const current = data.demographics.race || [];
    const updated = current.includes(race)
      ? current.filter((r) => r !== race)
      : [...current, race];
    updateDemographics('race', updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Demographic Information</h2>
          <p className="text-sm text-muted-foreground mt-1">{progressPercentage}% Completed</p>
        </div>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ethnicity
          </CardTitle>
          <CardDescription>Select all that apply (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.ethnicity?.includes('hispanic-latino')}
              onCheckedChange={() => toggleEthnicity('hispanic-latino')}
            />
            <Label className="font-normal cursor-pointer">Hispanic or Latino</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.ethnicity?.includes('not-hispanic-latino')}
              onCheckedChange={() => toggleEthnicity('not-hispanic-latino')}
            />
            <Label className="font-normal cursor-pointer">Not Hispanic or Latino</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.ethnicity?.includes('prefer-not-to-say')}
              onCheckedChange={() => toggleEthnicity('prefer-not-to-say')}
            />
            <Label className="font-normal cursor-pointer">I do not wish to provide this information</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Race</CardTitle>
          <CardDescription>Select all that apply (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.race?.includes('american-indian')}
              onCheckedChange={() => toggleRace('american-indian')}
            />
            <Label className="font-normal cursor-pointer">American Indian or Alaska Native</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.race?.includes('asian')}
              onCheckedChange={() => toggleRace('asian')}
            />
            <Label className="font-normal cursor-pointer">Asian</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.race?.includes('black')}
              onCheckedChange={() => toggleRace('black')}
            />
            <Label className="font-normal cursor-pointer">Black or African American</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.race?.includes('pacific-islander')}
              onCheckedChange={() => toggleRace('pacific-islander')}
            />
            <Label className="font-normal cursor-pointer">Native Hawaiian or Other Pacific Islander</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.race?.includes('white')}
              onCheckedChange={() => toggleRace('white')}
            />
            <Label className="font-normal cursor-pointer">White</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={data.demographics.race?.includes('prefer-not-to-say')}
              onCheckedChange={() => toggleRace('prefer-not-to-say')}
            />
            <Label className="font-normal cursor-pointer">I do not wish to provide this information</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gender</CardTitle>
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
              <Label htmlFor="gender-prefer-not" className="font-normal cursor-pointer">
                I do not wish to provide this information
              </Label>
            </div>
          </RadioGroup>
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
