interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType | (() => React.ReactNode);
    iconColor?: string;
}

export default function StatsCard({ title, value, icon: Icon, iconColor = "text-indigo-600" }: StatsCardProps) {
  return (
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
      </div>
  );
}