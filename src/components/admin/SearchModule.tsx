import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Store, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  email?: string;
  location?: string;
  type: 'student' | 'canteen';
}

interface SearchModuleProps {
  onSelectStudent: (id: string) => void;
  onSelectCanteen: (id: string) => void;
}

export function SearchModule({ onSelectStudent, onSelectCanteen }: SearchModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'students' | 'canteens'>('students');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      if (searchType === 'students') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .eq('role', 'student')
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(20);

        if (error) throw error;

        setResults(data?.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          type: 'student' as const,
        })) || []);
      } else {
        const { data, error } = await supabase
          .from('canteens')
          .select('id, name, location, vendor_email')
          .or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,vendor_email.ilike.%${searchQuery}%`)
          .limit(20);

        if (error) throw error;

        setResults(data?.map(c => ({
          id: c.id,
          name: c.name,
          email: c.vendor_email || undefined,
          location: c.location,
          type: 'canteen' as const,
        })) || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Search Module
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={searchType} onValueChange={(v) => { setSearchType(v as 'students' | 'canteens'); setResults([]); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="canteens" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Canteens
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder={`Search by name, email${searchType === 'students' ? ', phone' : ', location'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <TabsContent value="students" className="mt-4">
            <SearchResults 
              results={results} 
              onSelect={onSelectStudent} 
              type="student"
            />
          </TabsContent>

          <TabsContent value="canteens" className="mt-4">
            <SearchResults 
              results={results} 
              onSelect={onSelectCanteen} 
              type="canteen"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface SearchResultsProps {
  results: SearchResult[];
  onSelect: (id: string) => void;
  type: 'student' | 'canteen';
}

function SearchResults({ results, onSelect, type }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No results. Enter a search query and press Enter or click Search.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {results.map(result => (
        <button
          key={result.id}
          onClick={() => onSelect(result.id)}
          className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {type === 'student' ? (
              <User className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Store className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{result.name}</p>
              <p className="text-sm text-muted-foreground">
                {result.email || result.location || 'No additional info'}
              </p>
            </div>
          </div>
          <Badge variant="outline">{type}</Badge>
        </button>
      ))}
    </div>
  );
}
