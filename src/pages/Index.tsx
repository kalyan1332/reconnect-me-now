import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { ReportItemDialog } from "@/components/ReportItemDialog";
import { ItemDetailsDialog } from "@/components/ItemDetailsDialog";
import { SearchFilters, type SearchFilters as FilterType } from "@/components/SearchFilters";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Search, Package, Users, Shield, LogOut, LayoutDashboard, TrendingUp } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
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
  description: string | null;
  finder_name: string;
  contact_info: string;
}

const Index = () => {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, matches: 0 });
  const navigate = useNavigate();

  // Fetch items from database
  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching items:', error);
      } else {
        const itemsData = (data || []) as Item[];
        setItems(itemsData);
        setFilteredItems(itemsData);
        
        // Calculate stats
        const lostCount = itemsData.filter(i => i.status === 'lost').length;
        const foundCount = itemsData.filter(i => i.status === 'found').length;
        setStats({
          total: itemsData.length,
          lost: lostCount,
          found: foundCount,
          matches: 0, // Will be updated with real match count
        });
      }
      setLoading(false);
    };

    fetchItems();
    
    // Fetch matches count
    const fetchMatchesCount = async () => {
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });
      
      if (count !== null) {
        setStats(prev => ({ ...prev, matches: count }));
      }
    };
    
    fetchMatchesCount();

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
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [navigate]);
  // Fallback items when database is empty
  const fallbackItems: Item[] = [
    {
      id: "1",
      title: "Blue Backpack",
      category: "Bag & Luggage",
      location: "Central Park, NYC",
      date: "2024-03-15",
      status: "found" as const,
      image_url: itemBackpack,
      description: "Navy blue backpack with laptop compartment",
      finder_name: "John Doe",
      contact_info: "john@example.com",
    },
    {
      id: "2",
      title: "iPhone 15 Pro",
      category: "Electronics",
      location: "Starbucks, 5th Ave",
      date: "2024-03-14",
      status: "lost" as const,
      image_url: itemPhone,
      description: "Black iPhone 15 Pro with blue case",
      finder_name: "Jane Smith",
      contact_info: "jane@example.com",
    },
    {
      id: "3",
      title: "House Keys",
      category: "Keys & Accessories",
      location: "Subway Station",
      date: "2024-03-13",
      status: "found" as const,
      image_url: itemKeys,
      description: "Set of keys with blue keychain",
      finder_name: "Mike Johnson",
      contact_info: "mike@example.com",
    },
    {
      id: "4",
      title: "Brown Leather Wallet",
      category: "Wallet & Cards",
      location: "Coffee Shop",
      date: "2024-03-12",
      status: "lost" as const,
      image_url: itemWallet,
      description: "Brown leather wallet with cards",
      finder_name: "Sarah Wilson",
      contact_info: "sarah@example.com",
    },
  ];

  const displayItems = filteredItems.length > 0 ? filteredItems.slice(0, 8) : fallbackItems;

  const handleSearch = (filters: FilterType) => {
    let filtered = [...items];
    
    if (filters.query) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(filters.query.toLowerCase()) ||
        item.description?.toLowerCase().includes(filters.query.toLowerCase())
      );
    }
    
    if (filters.category !== "all") {
      filtered = filtered.filter(item => item.category === filters.category);
    }
    
    if (filters.status !== "all") {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    
    if (filters.location) {
      filtered = filtered.filter(item =>
        item.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setItemDetailsOpen(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!session) {
    return null;
  }

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
      {/* Navigation */}
      <nav className="bg-card shadow-sm sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Lost & Found</h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={session?.user.id} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="Dashboard">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

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

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-6 bg-card rounded-lg border border-border shadow-sm">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
            <div className="text-center p-6 bg-card rounded-lg border border-border shadow-sm">
              <Package className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-3xl font-bold text-foreground">{stats.lost}</p>
              <p className="text-sm text-muted-foreground">Lost Items</p>
            </div>
            <div className="text-center p-6 bg-card rounded-lg border border-border shadow-sm">
              <Package className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-3xl font-bold text-foreground">{stats.found}</p>
              <p className="text-sm text-muted-foreground">Found Items</p>
            </div>
            <div className="text-center p-6 bg-card rounded-lg border border-border shadow-sm">
              <Search className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-3xl font-bold text-foreground">{stats.matches}</p>
              <p className="text-sm text-muted-foreground">Matches Made</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <SearchFilters onSearch={handleSearch} />
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
              Our AI-powered platform makes it simple to reunite items with their owners
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
                <div key={item.id} onClick={() => handleItemClick(item)}>
                  <ItemCard 
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
                </div>
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
              <Button 
                size="lg" 
                variant="outline" 
                className="font-semibold"
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                About Lost & Found
              </h2>
              <p className="text-lg text-muted-foreground">
                A community-driven platform connecting people with their lost belongings
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold text-foreground">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We believe that every lost item has a story and every reunion brings hope. 
                  Our platform bridges the gap between those who have lost something precious 
                  and those who have found it, creating a trustworthy community where people 
                  help each other.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold text-foreground">How We Help</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our platform provides a simple, secure way to report and search for lost 
                  items. With real-time updates, location-based search, and a community of 
                  helpful members, we make the process of recovering lost belongings easier 
                  than ever before.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold text-foreground">Privacy & Security</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your privacy matters to us. All reports are securely stored, and contact 
                  information is only shared when you choose to connect with someone. We use 
                  industry-standard security practices to protect your data.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold text-foreground">Join the Community</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Whether you've lost something valuable or found an item that doesn't belong 
                  to you, our platform makes it easy to do the right thing. Join thousands of 
                  users who are helping reunite people with their belongings every day.
                </p>
              </div>
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

      {/* Item Details Dialog */}
      <ItemDetailsDialog
        open={itemDetailsOpen}
        onOpenChange={setItemDetailsOpen}
        item={selectedItem}
        currentUserId={session?.user.id}
      />
    </div>
  );
};

export default Index;
