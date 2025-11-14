import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { Resort } from "@shared/api";
import { supabase } from "@/lib/supabase";

interface DisplayResort extends Resort {
  isUpgrade?: boolean;
}

export default function DestinationDetails() {
  const { id } = useParams();
  const [resorts, setResorts] = useState<DisplayResort[]>([]);
  const [destinationName, setDestinationName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchResortsForDestination = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("resorts_by_destination")
          .select("*")
          .eq("destination_slug", id)
          .order("name", { ascending: true });

        if (fetchError) {
          console.error("Error fetching resorts:", fetchError);
          throw fetchError;
        }

        if (data && data.length > 0) {
          const destinationTitle = data[0].destination_name;
          setDestinationName(destinationTitle);

          const displayResorts: DisplayResort[] = data.map((resort) => ({
            ...resort,
            isUpgrade:
              resort.num_standard_weeks === 0 && resort.num_upgrade_weeks > 0,
          }));

          setResorts(displayResorts);
        } else {
          setDestinationName(
            id ? id.charAt(0).toUpperCase() + id.slice(1) : "",
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch resorts";
        setError(message);
        console.error("Error fetching resorts for destination:", err);
        setDestinationName(id ? id.charAt(0).toUpperCase() + id.slice(1) : "");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResortsForDestination();
  }, [id]);

  const standardResorts = resorts.filter((resort) => !resort.isUpgrade);
  const upgradeResorts = resorts.filter((resort) => resort.isUpgrade);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error loading resorts</p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            to="/destinations"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Icon name="arrow-left" size={16} />
            <span className="text-sm font-medium">Back to Destinations</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {destinationName} Resorts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose from our selection of premium resorts in {destinationName}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading resorts...</p>
          </div>
        ) : (
          <>
            {/* Standard Resorts Section */}
            {standardResorts.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Standard Resorts
                  </h2>
                  <Badge variant="secondary" className="ml-4">
                    {standardResorts.length} available
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {standardResorts.map((resort) => (
                    <Link
                      key={resort.id}
                      to={`/resort/${resort.id}`}
                      state={{ from: location.pathname }}
                    >
                      <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
                        <div className="aspect-[5/4] overflow-hidden">
                          <img
                            src={resort.image_url}
                            alt={resort.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="p-6">
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {resort.name}
                            </h3>
                            <div className="flex items-center text-gray-600 mb-2">
                              <Icon
                                name="location-dot"
                                size={16}
                                color="text-gray-600"
                                className="mr-1"
                              />
                              <span>{resort.location}</span>
                            </div>
                            {resort.google_user_rating && (
                              <div className="flex items-center text-gray-600">
                                <Icon
                                  name="star"
                                  size={16}
                                  color="text-yellow-500"
                                  className="mr-1"
                                />
                                <span>
                                  {resort.google_user_rating.toFixed(1)}
                                </span>
                                {resort.google_num_reviews && (
                                  <>
                                    <span className="hidden sm:inline text-gray-500 ml-1 font-normal">
                                      ({resort.google_num_reviews})
                                    </span>
                                    <span className="block sm:hidden text-gray-500 text-xs leading-tight ml-0 font-normal">
                                      {resort.google_num_reviews}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            {/* Standard Weeks */}
                            <div className="bg-green-50 rounded-lg p-4">
                              <h4 className="font-medium text-green-900 mb-2">
                                Standard Weeks
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-700">
                                    Availability:
                                  </span>
                                  <Badge
                                    variant={
                                      resort.num_standard_weeks > 0
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {resort.num_standard_weeks > 0
                                      ? `${resort.num_standard_weeks} weeks available`
                                      : "No standard weeks"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Upgrade Weeks */}
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-2">
                                Upgrade Weeks
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-blue-700">
                                    Availability:
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-blue-200 text-blue-700"
                                  >
                                    {resort.num_upgrade_weeks} upgrade weeks
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Upgrade Resorts Section */}
            {upgradeResorts.length > 0 && (
              <section>
                <div className="flex items-center mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Upgrade Resorts
                  </h2>
                  <Badge
                    variant="outline"
                    className="ml-4 border-amber-200 text-amber-700 bg-amber-50"
                  >
                    {upgradeResorts.length} premium options
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {upgradeResorts.map((resort) => (
                    <Link
                      key={resort.id}
                      to={`/resort/${resort.id}`}
                      state={{ from: location.pathname }}
                    >
                      <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden h-full border-amber-200">
                        <div className="relative">
                          <div className="aspect-[5/4] overflow-hidden">
                            <img
                              src={resort.image_url}
                              alt={resort.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <Badge className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-600">
                            Premium
                          </Badge>
                        </div>
                        <CardContent className="p-6">
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {resort.name}
                            </h3>
                            <div className="flex items-center text-gray-600 mb-2">
                              <Icon
                                name="location-dot"
                                size={16}
                                color="text-gray-600"
                                className="mr-1"
                              />
                              <span>{resort.location}</span>
                            </div>
                            {resort.google_user_rating && (
                              <div className="flex items-center text-gray-600">
                                <Icon
                                  name="star"
                                  size={16}
                                  color="text-yellow-500"
                                  className="mr-1"
                                />
                                <span>
                                  {resort.google_user_rating.toFixed(1)}
                                </span>
                                {resort.google_num_reviews && (
                                  <>
                                    <span className="hidden sm:inline text-gray-500 ml-1 font-normal">
                                      ({resort.google_num_reviews})
                                    </span>
                                    <span className="block sm:hidden text-gray-500 text-xs leading-tight ml-0 font-normal">
                                      {resort.google_num_reviews}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            {/* Standard Weeks */}
                            <div className="bg-green-50 rounded-lg p-4">
                              <h4 className="font-medium text-green-900 mb-2">
                                Standard Weeks
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-700">
                                    Availability:
                                  </span>
                                  <Badge
                                    variant={
                                      resort.num_standard_weeks > 0
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {resort.num_standard_weeks > 0
                                      ? `${resort.num_standard_weeks} weeks available`
                                      : "No standard weeks"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Upgrade Weeks */}
                            <div className="bg-amber-50 rounded-lg p-4">
                              <h4 className="font-medium text-amber-900 mb-2">
                                Upgrade Weeks
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-amber-700">
                                    Availability:
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-amber-200 text-amber-700"
                                  >
                                    {resort.num_upgrade_weeks} upgrade weeks
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {resorts.length === 0 && (
              <div className="text-center py-20">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  No resorts available yet
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  We're working on adding amazing resorts to this destination.
                  Check back soon!
                </p>
                <Link to="/destinations">
                  <Button>Explore Other Destinations</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
