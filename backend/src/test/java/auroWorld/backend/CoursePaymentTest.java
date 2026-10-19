package auroWorld.backend;

import junit.framework.TestCase;

public class CoursePaymentTest extends TestCase {
    public void testOptionalAndWebLinks() {
        assertTrue(CoursePayment.isValidUrl(null));
        assertTrue(CoursePayment.isValidUrl(""));
        assertTrue(CoursePayment.isValidUrl(" https://example.com/pay?id=10 "));
        assertTrue(CoursePayment.isValidUrl("http://example.com/pay"));
    }

    public void testInvalidLinks() {
        for (String value : new String[] {"javascript:alert(1)", "file:///secret", "/pay", "https://", "https://a:b@example.com", "https://example.com/a b", "https://example.com/" + "x".repeat(2048)}) {
            assertFalse(CoursePayment.isValidUrl(value));
        }
    }
}
