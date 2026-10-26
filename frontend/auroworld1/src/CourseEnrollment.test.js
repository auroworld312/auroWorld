import { render, screen, fireEvent } from '@testing-library/react';
import CourseEnrollment, { CourseOverview, courseDays, paymentLink } from './CourseEnrollment';

const course = { title: 'French', price: 'Free', level: 'Beginner', daysOfWeek: '1,2,3,4,5', units: [{ lessons: [{}, {}] }] };

test('free enrollment calls the enrollment action', () => {
    const enroll = jest.fn();
    render(<CourseEnrollment course={course} onEnroll={enroll} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enroll Now' }));
    expect(enroll).toHaveBeenCalledTimes(1);
});

test('paid courses navigate externally without enrolling', () => {
    const enroll = jest.fn();
    render(<CourseEnrollment course={{ ...course, price: 'Priced', paymentUrl: 'https://example.com/pay' }} onEnroll={enroll} />);
    const link = screen.getByRole('link', { name: /Purchase Now/ });
    expect(link).toHaveAttribute('href', 'https://example.com/pay');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button', { name: 'Enroll Now' })).not.toBeInTheDocument();
    expect(enroll).not.toHaveBeenCalled();
});

test.each(['', 'javascript:alert(1)', 'https://user:pass@example.com'])('unusable payment link disables payment: %s', paymentUrl => {
    render(<CourseEnrollment course={{ ...course, price: 'Priced', paymentUrl }} />);
    expect(screen.getByRole('button', { name: 'Payment unavailable' })).toBeDisabled();
    expect(paymentLink(paymentUrl)).toBe('');
});

test('enrolled students and owners are not prompted to buy again', () => {
    const { rerender } = render(<CourseEnrollment course={course} enrolled />);
    expect(screen.getByText('Already Enrolled')).toBeInTheDocument();
    rerender(<CourseEnrollment course={course} isOwner />);
    expect(screen.getByText('Your course')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('overview has compact days and no management actions', () => {
    render(<CourseOverview course={course} />);
    expect(screen.getByText('Weekdays')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(courseDays('0,6')).toBe('Weekend');
    expect(courseDays('0,1,2,3,4,5,6')).toBe('Every day');
    expect(courseDays('1,3,5')).toBe('Mon, Wed, Fri');
});
