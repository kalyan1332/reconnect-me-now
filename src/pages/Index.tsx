import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { ReportItemDialog } from "@/components/ReportItemDialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Users, Shield } from "lucide-react";
import heroImage from "@/assets/hero-lost-found.jpg";
import itemBackpack from "@/assets/item-backpack.jpg";
import itemPhone from "@/assets/item-phone.jpg";
import itemKeys from "@/assets/item-keys.jpg";
import itemWallet from "@/assets/item-wallet.jpg";

interface Item {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  status: "lost" | "found";
  image_url: string | null;
}

const Index = () => {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch items from database
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, category, location, date, status, image_url')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Error fetching items:', error);
      } else {
        setItems((data || []) as Item[]);
      }
      setLoading(false);
    };

    fetchItems();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  // Fallback items when database is empty
  const fallbackItems = [
    {
      id: "1",
      title: "Blue Backpack",
      category: "Bag & Luggage",
      location: "Central Park, NYC",
      date: "2024-03-15",
      status: "found" as const,
      image_url: itemBackpack,
    },
    {
      id: "2",
      title: "iPhone 15 Pro",
      category: "Electronics",
      location: "Starbucks, 5th Ave",
      date: "2024-03-14",
      status: "lost" as const,
      image_url: itemPhone,
    },
    {
      id: "3",
      title: "House Keys",
      category: "Keys & Accessories",
      location: "Subway Station",
      date: "2024-03-13",
      status: "found" as const,
      image_url: itemKeys,
    },
    {
      id: "4",
      title: "Brown Leather Wallet",
      category: "Wallet & Cards",
      location: "Coffee Shop",
      date: "2024-03-12",
      status: "lost" as const,
      image_url: itemWallet,
    },
  ];

  const displayItems = items.length > 0 ? items : fallbackItems;

  const features = [
    {
      icon: Search,
      title: "Easy Search",
      description: "Browse through lost and found items with powerful search filters",
    },
    {
      icon: Package,
      title: "Quick Reporting",
      description: "Report lost or found items in seconds with our simple form",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Join a helpful community dedicated to reuniting people with their belongings",
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "Your privacy and security are our top priorities",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight">
              Lost Something? Found Something?
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
              Connect with your community to reunite lost items with their owners. 
              Every item has a story, and every reunion brings hope.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-base font-semibold shadow-soft hover:shadow-card transition-smooth"
                onClick={() => {
                  setReportType("lost");
                  setReportDialogOpen(true);
                }}
              >
                Report Lost Item
              </Button>
              <Button 
                size="lg"
                className="text-base font-semibold bg-accent hover:bg-accent-hover text-accent-foreground shadow-soft transition-smooth"
                onClick={() => {
                  setReportType("found");
                  setReportDialogOpen(true);
                }}
              >
                Report Found Item
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform makes it simple to help others find their lost belongings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center space-y-4 p-6 rounded-lg bg-card border border-border hover:shadow-card transition-smooth"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Items Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Recent Reports
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Check out the latest lost and found items from our community
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading items...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {displayItems.map((item) => (
                <ItemCard 
                  key={item.id}
                  image={item.image_url || itemBackpack}
                  title={item.title}
                  category={item.category}
                  location={item.location}
                  date={new Date(item.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  status={item.status}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" className="font-semibold">
              View All Items
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Make a Difference?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join our community and help reunite people with their belongings today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                onClick={() => {
                  setReportType("lost");
                  setReportDialogOpen(true);
                }}
              >
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="font-semibold">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">Lost & Found</h3>
            <p className="text-muted-foreground">
              Helping communities reconnect with their belongings
            </p>
            <div className="text-sm text-muted-foreground pt-4 border-t border-border">
              © 2024 Lost & Found. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Report Dialog */}
      <ReportItemDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        type={reportType}
      />
    </div>
  );
};

export default Index;
