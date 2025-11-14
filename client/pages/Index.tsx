import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/Icon";

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-sky-600 to-sky-700 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Your Dream Vacation
            <span className="block text-sky-200">Awaits</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-sky-100 max-w-3xl mx-auto">
            Redeem your travel vouchers for incredible stays at premium resorts
            worldwide
          </p>
          <Link to="/destinations">
            <Button
              size="lg"
              className="bg-white text-sky-700 hover:bg-sky-50 text-lg px-8 py-4"
            >
              Explore Destinations
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Travel Portal?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience seamless voucher redemption with exclusive access to
              premium resorts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="location-dot" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Premium Destinations
                </h3>
                <p className="text-gray-600">
                  Access to exclusive resorts in top destinations worldwide
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="calendar-days" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Flexible Booking</h3>
                <p className="text-gray-600">
                  Easy scheduling with available dates released regularly
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="shield" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Savings Guarantee
                </h3>
                <p className="text-gray-600">
                  Our guarantee ensures you get the best value for your vouchers
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="star" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality Resorts</h3>
                <p className="text-gray-600">
                  Hand-selected resorts with excellent ratings and amenities
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-sky-50 to-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Browse our collection of amazing destinations and find your perfect
            getaway
          </p>
          <Link to="/destinations">
            <Button size="lg" className="text-lg px-8 py-4">
              View All Destinations
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
