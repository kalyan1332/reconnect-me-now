import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Package, MessageSquare, TrendingUp, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { ItemCard } from "@/components/ItemCard";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  item_id: string | null;
}

interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  status: string;
  created_at: string;
  lost_item: any;
  found_item: any;
}

interface Item {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  status: "lost" | "found";
  image_url: string | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        fetchDashboardData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    try {
      // Fetch user's profile to get items they reported
      const { data: profile } = await supabase
        .from('profiles')
        .select('contact_number')
        .eq('user_id', userId)
        .single();

      // Fetch notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }

      // Fetch matches for items the user has reported
      const { data: items } = await supabase
        .from('items')
        .select('id, title, category, location, date, status, image_url, created_at, contact_info')
        .order('created_at', { ascending: false });

      if (items) {
        // Filter items based on user's contact info from profile
        const userItems = items.filter(item => {
          // This is a simple check - in production you'd want to link items to user_id
          return item.contact_info && profile?.contact_number && 
                 item.contact_info.includes(profile.contact_number);
        });
        setMyItems(userItems as Item[]);

        // Fetch matches for user's items
        const itemIds = userItems.map(i => i.id);
        if (itemIds.length > 0) {
          const { data: matchData } = await supabase
            .from('matches')
            .select(`
              *,
              lost_item:items!matches_lost_item_id_fkey(*),
              found_item:items!matches_found_item_id_fkey(*)
            `)
            .or(`lost_item_id.in.(${itemIds.join(',')}),found_item_id.in.(${itemIds.join(',')})`)
            .order('match_score', { ascending: false });

          if (matchData) {
            setMatches(matchData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!session?.user.id) return;

    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        () => {
          fetchDashboardData(session.user.id);
        }
      )
      .subscribe();

    const matchesChannel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => {
          fetchDashboardData(session.user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [session]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const updateMatchStatus = async (matchId: string, status: string) => {
    const { error } = await supabase
      .from('matches')
      .update({ status })
      .eq('id', matchId);

    if (error) {
      toast.error("Failed to update match status");
    } else {
      toast.success(`Match ${status}!`);
      if (session?.user.id) {
        fetchDashboardData(session.user.id);
      }
    }
  };

  const getMatchBadgeColor = (score: number) => {
    if (score >= 70) return "bg-success text-success-foreground";
    if (score >= 50) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-accent" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card shadow-sm sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">My Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myItems.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Potential Matches</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{matches.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items">My Items</TabsTrigger>
            <TabsTrigger value="matches">
              Matches {matches.length > 0 && `(${matches.length})`}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Items I've Reported</CardTitle>
                <CardDescription>
                  All lost and found items you've submitted
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">You haven't reported any items yet</p>
                    <Button className="mt-4" onClick={() => navigate("/")}>
                      Report an Item
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        image={item.image_url || "/placeholder.svg"}
                        title={item.title}
                        category={item.category}
                        location={item.location}
                        date={new Date(item.date).toLocaleDateString()}
                        status={item.status}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Potential Matches</CardTitle>
                <CardDescription>
                  AI-powered matches between lost and found items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No matches found yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Matches will appear automatically when similar items are reported
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <Card key={match.id} className="border-2">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Badge className={getMatchBadgeColor(match.match_score)}>
                                {match.match_score}% Match
                              </Badge>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(match.status)}
                                <span className="text-sm text-muted-foreground capitalize">
                                  {match.status}
                                </span>
                              </div>
                            </div>
                            {match.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMatchStatus(match.id, 'confirmed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMatchStatus(match.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-2 text-destructive">Lost Item</h4>
                              <ItemCard
                                image={match.lost_item.image_url || "/placeholder.svg"}
                                title={match.lost_item.title}
                                category={match.lost_item.category}
                                location={match.lost_item.location}
                                date={new Date(match.lost_item.date).toLocaleDateString()}
                                status="lost"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2 text-success">Found Item</h4>
                              <ItemCard
                                image={match.found_item.image_url || "/placeholder.svg"}
                                title={match.found_item.title}
                                category={match.found_item.category}
                                location={match.found_item.location}
                                date={new Date(match.found_item.date).toLocaleDateString()}
                                status="found"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Stay updated on matches and messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={`cursor-pointer transition-colors ${
                          !notification.read ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{notification.title}</h4>
                                {!notification.read && (
                                  <Badge variant="default" className="text-xs">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
