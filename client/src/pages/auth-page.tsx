import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TrendingUp, Lock, User } from "lucide-react";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: InsertUser) => {
    if (mode === "login") {
      loginMutation.mutate(data);
    } else {
      registerMutation.mutate(data);
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Hero Section */}
        <div className="hidden md:flex flex-col justify-center space-y-6 text-center">
          <div className="mx-auto h-24 w-24 bg-primary rounded-2xl flex items-center justify-center mb-6">
            <TrendingUp className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Lead Manager</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Streamline your sales process with our comprehensive lead management system.
            </p>
            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Advanced lead tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Powerful filtering & search</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Real-time analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="md:hidden mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {mode === "login" ? "Welcome back" : "Create account"}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {mode === "login" 
                  ? "Sign in to your account to manage leads"
                  : "Sign up to start managing your leads"
                }
              </CardDescription>
            </CardHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter your username"
                              className="pl-10"
                              data-testid="input-username"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter your password"
                              className="pl-10"
                              data-testid="input-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {mode === "login" && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <Label htmlFor="remember" className="text-sm text-gray-700">
                          Remember me
                        </Label>
                      </div>
                      <Button variant="link" className="p-0 h-auto text-sm">
                        Forgot password?
                      </Button>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid={mode === "login" ? "button-login" : "button-register"}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{mode === "login" ? "Signing in..." : "Creating account..."}</span>
                      </div>
                    ) : (
                      mode === "login" ? "Sign in" : "Create account"
                    )}
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    {mode === "login" ? (
                      <>
                        Don't have an account?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => setMode("register")}
                          data-testid="button-switch-register"
                        >
                          Register here
                        </Button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => setMode("login")}
                          data-testid="button-switch-login"
                        >
                          Sign in here
                        </Button>
                      </>
                    )}
                  </div>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
