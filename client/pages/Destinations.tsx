import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Destination } from "@shared/api";
import { supabase } from "@/lib/supabase";

export default function Destinations() {
  const [usDestinations, setUsDestinations] = useState<Destination[]>([]);
  const [internationalDestinations, setInternationalDestinations] = useState<
    Destination[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setIsLoading(true);
        const { data: usData, error: usError } = await supabase
          .from("destinations")
          .select("id, name, slug, type, description, is_featured")
          .eq("in_united_states", true)
          .eq("type", "us_region")
          .order("display_order", { ascending: true });

        if (usError) {
          const errorMsg =
            typeof usError === "object" && usError !== null && "message" in usError
              ? String(usError.message)
              : String(usError);
          console.error("US destinations error:", errorMsg);
          throw new Error(errorMsg);
        }

        const { data: intlData, error: intlError } = await supabase
          .from("destinations")
          .select("id, name, slug, type, description, is_featured")
          .eq("in_united_states", false)
          .order("display_order", { ascending: true });

        if (intlError) {
          const errorMsg =
            typeof intlError === "object" && intlError !== null && "message" in intlError
              ? String(intlError.message)
              : String(intlError);
          console.error("International destinations error:", errorMsg);
          throw new Error(errorMsg);
        }

        setUsDestinations(usData || []);
        setInternationalDestinations(intlData || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch destinations";
        setError(message);
        console.error("Error fetching destinations:", message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  const vouchersRemaining = 3;
  const leftoverNights = 5;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Error loading destinations
          </p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Destination
          </h1>
          <div className="flex justify-center gap-4 flex-wrap">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              You have {vouchersRemaining} vouchers remaining
            </Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">
              You have {leftoverNights} leftover nights
            </Badge>
          </div>
        </div>

        {/* U.S. Destinations */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            U.S. Destinations
          </h2>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading destinations...</p>
            </div>
          ) : usDestinations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No U.S. destinations available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {usDestinations.map((destination) => (
                <Link
                  key={destination.id}
                  to={`/destination/${destination.slug}`}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src="/placeholder.svg"
                        alt={destination.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 text-center">
                        {destination.name}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* International Destinations */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            International Destinations
          </h2>
          {internationalDestinations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No international destinations available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {internationalDestinations.map((destination) => (
                <Link
                  key={destination.id}
                  to={`/destination/${destination.slug}`}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src="/placeholder.svg"
                        alt={destination.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 text-center">
                        {destination.name}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
