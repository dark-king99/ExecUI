
import React from "react";
import {
    BadgeCheck,
    BarChart3,
    Building2,
    CalendarCheck2,
    MessageCircle,
    PackageCheck,
    ShieldCheck,
    Star,
    ThumbsUp,
    Users,
    ChevronRight,   // ✅ add this
  } from "lucide-react";
  
  const enterpriseStats = [
    { label: "Active products", value: "128" },
    { label: "Campaigns live", value: "42" },
    { label: "Employees", value: "314" },
    { label: "Customer ratings", value: "4.8" },
  ];
  
  const productPosts = [
    {
      title: "NovaEdge Inventory Suite",
      tag: "Product release",
      time: "2 hours ago",
      description:
        "A unified inventory command center with AI forecasts, demand signals, and warehouse sync.",
    },
    {
      title: "Artemis Cloud Security Pack",
      tag: "Service update",
      time: "1 day ago",
      description:
        "Zero-trust network policies + continuous compliance reporting for regulated teams.",
    },
    {
      title: "Pulse Market Toolkit",
      tag: "Growth stack",
      time: "3 days ago",
      description:
        "Launch multichannel campaigns with creative intelligence and prompt-driven workflows.",
    },
  ];
  
  const campaignPosts = [
    {
      title: "Q4 Customer Momentum",
      date: "Oct 18 - Nov 30",
      description:
        "AI-personalized outreach across email, ads, and social with live performance tuning.",
    },
    {
      title: "Retail Network Acceleration",
      date: "Nov 5 - Dec 10",
      description:
        "Roll out network upgrades with automated mapping, alerts, and rapid issue triage.",
    },
  ];
  
  const employeeHighlights = [
    {
      name: "Samira Khan",
      role: "Head of Growth",
      association: "Marketing Automation Studio",
    },
    {
      name: "Darius Cole",
      role: "Network Operations Lead",
      association: "Realtime Monitoring & Mapping",
    },
    {
      name: "Elena Park",
      role: "Customer Success Director",
      association: "Client Portfolio Management",
    },
  ];
  
  const customerFeed = [
    {
      company: "Atlas Retail",
      title: "Q4 Customer Momentum",
      reaction: "Loved the AI personalization flow.",
      rating: 5,
    },
    {
      company: "Meridian Labs",
      title: "NovaEdge Inventory Suite",
      reaction: "Inventory forecasting saved us 14% this quarter.",
      rating: 4,
    },
    {
      company: "Solstice Energy",
      title: "Artemis Cloud Security Pack",
      reaction: "Security posture dashboards are incredibly clear.",
      rating: 5,
    },
  ];
  
  export default function AccountView() {
    return (
      <div className="min-h-full min-w-full content-fill px-0 py-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm 
 text-slate-900 dark:text-white">
        <div className="flex-1 p-0 relative">
        <div className="
  absolute inset-0 
  hidden 
  dark:block
  dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_20%_40%,rgba(244,63,94,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.18),transparent_45%)]
" />
          <div className="
  bg-white
  dark:bg-[radial-gradient(circle_at_top,...)]
" />
                  <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12">
            <header className="grid gap-8  bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex flex-col gap-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-full  bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  <BadgeCheck className="h-4 w-4" />
                  Enterprise Profile
                </div>
                <div>
                  <h1 className="text-4xl font-semibold text-slate-900 dark:text-white">Artemis Haven</h1>
                  <p className="mt-2 max-w-xl text-sm text-slate-500">
                    Share products, services, campaigns, and employee spotlights to keep
                    customers engaged. Enterprises manage only their profile page.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="rounded-full  bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white">
                    Post update
                  </button>
                  <button className="rounded-full  bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white">
                    View customer feed
                  </button>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Enterprise status
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                    Profile active · Audience growing
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-cyan-200" />
                    Verified & secure
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {enterpriseStats.map((stat) => (
                    <div
                      key={stat.label}
                      className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6"
                    >
                      <p className="text-xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </header>
  
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Inventory & services
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Product & service posts
                      </h2>
                    </div>
                    <PackageCheck className="h-6 w-6 text-cyan-200" />
                  </div>
                  <div className="mt-6 grid gap-4">
                    {productPosts.map((post) => (
                      <article
                        key={post.title}
                        className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
                      >
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800  px-3 py-1 uppercase tracking-[0.2em]">
                            {post.tag}
                          </span>
                          <span>{post.time}</span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {post.description}
                        </p>
                        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                          <ThumbsUp className="h-4 w-4 text-emerald-300" />
                          248 engagements
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
  
                <div className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Campaigns
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                        Active campaigns
                      </h2>
                    </div>
                    <CalendarCheck2 className="h-6 w-6 text-fuchsia-200" />
                  </div>
                  <div className="mt-6 grid gap-4">
                    {campaignPosts.map((campaign) => (
                      <article
                        key={campaign.title}
                        className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
                      >
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span className="uppercase tracking-[0.2em]">{campaign.date}</span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3.5 w-3.5 text-cyan-200" />
                            Live metrics
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                          {campaign.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {campaign.description}
                        </p>
                        <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800  px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white">
                          View performance
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
  
              <aside className="flex flex-col gap-6">
                <div className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Employees & associations
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tetx-slate-900 dark:text-white">
                        Team spotlight
                      </h2>
                    </div>
                    <Users className="h-6 w-6 text-emerald-200" />
                  </div>
                  <div className="mt-6 grid gap-4">
                    {employeeHighlights.map((employee) => (
                      <div
                        key={employee.name}
                        className= "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {employee.name}
                        </p>
                        <p className="text-xs text-slate-900">{employee.role}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <Building2 className="h-3.5 w-3.5 text-cyan-200" />
                          {employee.association}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
  
                <div className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Customer UI preview
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                        Customer feed view
                      </h2>
                    </div>
                    <MessageCircle className="h-6 w-6 text-cyan-200" />
                  </div>
                  <div className="mt-6 grid gap-4">
                    {customerFeed.map((post) => (
                      <div
                        key={`${post.company}-${post.title}`}
                        className=" bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {post.company}
                            </p>
                            <p className="text-xs text-slate-400">{post.title}</p>
                          </div>
                          <div className="flex items-center gap-1 text-amber-300">
                            {Array.from({ length: post.rating }).map((_, index) => (
                              <Star key={`${post.company}-${index}`} className="h-3 w-3" />
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-500">
                          “{post.reaction}”
                        </p>
                        <button className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200">
                          Reply
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </div>
    );
  }
  