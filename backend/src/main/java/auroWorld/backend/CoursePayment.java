package auroWorld.backend;

import java.net.URI;

final class CoursePayment {
    static boolean isValidUrl(String value) {
        if (value == null || value.isBlank()) return true;
        if (value.length() > 2048) return false;
        try {
            URI url = URI.create(value.trim());
            return ("https".equalsIgnoreCase(url.getScheme()) || "http".equalsIgnoreCase(url.getScheme()))
                && url.getHost() != null && url.getUserInfo() == null;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
