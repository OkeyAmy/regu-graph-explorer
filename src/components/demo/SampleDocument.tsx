import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useRegulationStore, DocumentData } from '@/store/regulationStore';

const SAMPLE_DOCUMENT: DocumentData = {
  metadata: {
    title: "DIGITAL ASSETS AND REGISTERED EXCHANGES ACT, 2024",
    jurisdiction: "The Bahamas",
    document_type: "Act",
    source: "Sample Document"
  },
  hierarchy: [
    {
      id: "part1",
      type: "part",
      number: "I",
      title: "PRELIMINARY",
      text: "PART I - PRELIMINARY",
      level: 1,
      references: [],
      children: [
        {
          id: "sec1",
          type: "section",
          number: "1",
          title: "Short title and commencement",
          text: "(1) This Act may be cited as the Digital Assets and Registered Exchanges Act, 2024. (2) This Act shall come into operation on such date as the Minister may appoint by notice published in the Gazette.",
          level: 2,
          references: [],
          children: [
            {
              id: "sec1p1",
              type: "paragraph",
              number: "(1)",
              title: "",
              text: "This Act may be cited as the Digital Assets and Registered Exchanges Act, 2024.",
              level: 3,
              references: [],
              children: []
            },
            {
              id: "sec1p2", 
              type: "paragraph",
              number: "(2)",
              title: "",
              text: "This Act shall come into operation on such date as the Minister may appoint by notice published in the Gazette.",
              level: 3,
              references: [],
              children: []
            }
          ]
        },
        {
          id: "sec2",
          type: "section", 
          number: "2",
          title: "Interpretation",
          text: "In this Act, unless the context otherwise requires — 'accredited investor' means any person who comes within the categories specified in section 9 of this Act.",
          level: 2,
          references: [
            {
              target: "sec9",
              text: "section 9",
              type: "internal" as const
            }
          ],
          children: []
        }
      ]
    },
    {
      id: "part2",
      type: "part",
      number: "II",
      title: "ADMINISTRATION OF ACT",
      text: "PART II - ADMINISTRATION OF ACT",
      level: 1,
      references: [],
      children: [
        {
          id: "sec9",
          type: "section",
          number: "9",
          title: "Accredited investor categories",
          text: "For the purposes of this Act, an accredited investor includes any bank licensed under relevant legislation. This section is referenced in section 2.",
          level: 2,
          references: [
            {
              target: "sec2",
              text: "section 2", 
              type: "internal" as const
            }
          ],
          children: []
        }
      ]
    }
  ]
};

export function SampleDocumentLoader() {
  const { setDocumentData } = useRegulationStore();

  const loadSampleDocument = () => {
    setDocumentData(SAMPLE_DOCUMENT);
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Try Sample Document
        </CardTitle>
        <CardDescription className="text-sm">
          Load a sample regulation to explore the features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={loadSampleDocument} variant="outline" className="w-full">
          Load Bahamas Digital Assets Act (Sample)
        </Button>
      </CardContent>
    </Card>
  );
}