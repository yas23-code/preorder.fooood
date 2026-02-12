import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, RefreshCw, Brain, ChevronDown, ChevronUp, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Prediction {
  itemName: string;
  menuItemId: string;
  predictedQuantity: number;
  totalOrdered: number;
  daysWithData: number;
}

interface PredictionResponse {
  predictions: Prediction[];
  targetDay: number;
  targetHour: number;
  dataSource?: string;
  daysAnalyzed?: number;
  message: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const REFRESH_INTERVAL = 10 * 60 * 1000;

export function DemandPrediction({ canteenId }: { canteenId: string }) {
  const [data, setData] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPredictions = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('demand-prediction');

      if (fnError) {
        console.error('Demand prediction error:', fnError);
        setError('Failed to load predictions');
        return;
      }

      setData(result as PredictionResponse);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Demand prediction fetch error:', err);
      setError('Failed to load predictions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();

    const interval = setInterval(() => {
      fetchPredictions(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchPredictions]);

  const getHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const nextHour = (hour + 1) % 24;
    const nextPeriod = nextHour >= 12 ? 'PM' : 'AM';
    const displayNextHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour;
    return `${displayHour} ${period} – ${displayNextHour} ${nextPeriod}`;
  };

  const getDemandLevel = (qty: number) => {
    if (qty >= 80) return { label: 'High', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame };
    if (qty >= 40) return { label: 'Medium', color: 'bg-primary/10 text-primary-foreground border-primary/30', icon: Zap };
    return { label: 'Low', color: 'bg-secondary text-secondary-foreground border-border', icon: TrendingUp };
  };

  const getBarGradient = (qty: number) => {
    if (qty >= 80) return 'from-destructive to-destructive/70';
    if (qty >= 40) return 'from-primary to-primary/70';
    return 'from-emerald-500 to-emerald-400';
  };

  const getQuantityBarWidth = (qty: number, maxQty: number) => {
    if (maxQty === 0) return '0%';
    return `${Math.min((qty / maxQty) * 100, 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 mb-6 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxQty = data?.predictions?.length
    ? Math.max(...data.predictions.map(p => p.predictedQuantity))
    : 0;

  return (
    <div className="bg-card rounded-2xl border border-border mb-6 shadow-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-secondary/40 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-card">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h2 className="text-base md:text-lg font-bold font-display text-foreground tracking-tight">
              AI Demand Prediction
            </h2>
            {data && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {DAY_NAMES[data.targetDay]}
                </span>
                <span className="text-xs text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground">
                  {getHourLabel(data.targetHour)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              fetchPredictions(true);
            }}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-xl hover:bg-secondary"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 md:px-5 pb-5">
          {/* Divider */}
          <div className="h-px bg-border mb-4" />

          {error ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-destructive/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Couldn't load predictions</p>
              <p className="text-xs text-muted-foreground mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPredictions()}
                className="rounded-xl"
              >
                Try Again
              </Button>
            </div>
          ) : !data?.predictions?.length ? (
            <div className="text-center py-8">
              <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground">No predictions yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">
                Predictions appear once you have completed order history
              </p>
            </div>
          ) : (
            <>
              {/* Meta info */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border/50">
                  {data.message}
                </span>
                {lastUpdated && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Predictions grid */}
              <div className="space-y-2.5">
                {data.predictions.map((prediction, index) => {
                  const demand = getDemandLevel(prediction.predictedQuantity);
                  const DemandIcon = demand.icon;

                  return (
                    <div
                      key={prediction.menuItemId}
                      className="group relative p-3.5 rounded-xl bg-background border border-border/60 hover:border-primary/30 hover:shadow-card transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank badge */}
                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-foreground">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Item details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-foreground truncate pr-3">
                              {prediction.itemName}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <DemandIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-lg font-bold text-foreground tabular-nums">
                                {prediction.predictedQuantity}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(prediction.predictedQuantity)} transition-all duration-700 ease-out`}
                              style={{ width: getQuantityBarWidth(prediction.predictedQuantity, maxQty) }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}