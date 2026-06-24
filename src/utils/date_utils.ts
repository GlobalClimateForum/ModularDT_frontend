export function formatDate(iso: string): string {

    // calculate how long ago the date is from now
    const min_ago = (Date.now() - new Date(iso).getTime()) / (1000 * 60);
    const hours_ago = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
    const days_ago = hours_ago / 24;

    if (min_ago < 1) {
        return "Just now";
    } else if (min_ago < 60) {
        return `${Math.floor(min_ago)} ${Math.floor(min_ago) <= 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours_ago < 24) {
        return `${Math.floor(hours_ago)} ${Math.floor(hours_ago) <= 1 ? 'hour' : 'hours'} ago`;
    } else {
        return `${Math.floor(days_ago)} ${Math.floor(days_ago) <= 1 ? 'day' : 'days'} ago`;
    }
}
